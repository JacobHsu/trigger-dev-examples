import { schedules } from "@trigger.dev/sdk";
import Anchorbrowser from 'anchorbrowser';

async function sendTelegram(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const chatId = process.env.TELEGRAM_CHAT_ID!;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
  });
}

export const tradingviewStrongBuy = schedules.task({
  id: "tradingview-us-strong-buy",
  cron: {
    pattern: "0 15 * * 1-5",
    timezone: "America/New_York",
  },
  run: async () => {
    const client = new Anchorbrowser({
      apiKey: process.env.ANCHOR_BROWSER_API_KEY!,
      timeout: 10 * 60 * 1000, // 10 minutes
    });

    let session;
    try {
      session = await client.sessions.create();
      console.log(`Session ID: ${session.data.id}`);
      console.log(`Live View: https://live.anchorbrowser.io?sessionId=${session.data.id}`);

      const response = await client.tools.performWebTask({
        sessionId: session.data.id,
        url: "https://www.tradingview.com/markets/stocks-usa/market-movers-losers/",
        prompt: `On this TradingView page, find stocks that meet BOTH conditions:
1. Price is greater than $10 USD
2. Analyst Rating column shows "Strong Buy"

Return the top 8 matches. For each stock provide:
- Symbol
- Company name
- Current price (USD)
- Market Cap (include the value and unit, e.g. 4.5B or 800M)
- Analyst Rating
- Sector

Format each result as:
Stock: [SYMBOL] | [Company] | Price: $[price] | Market Cap: [cap] | Rating: [rating] | Sector: [sector]

If fewer than 8 match, return however many qualify. If none match, say "No matches found".`
      });

      console.log("Raw response:", response);

      const result = response.data.result?.result || response.data.result || response.data;

      if (result && typeof result === 'string' && result.includes('Stock:')) {
        const lines = result
          .split('\n')
          .filter((line: string) => line.trim().startsWith('Stock:'))
          .filter((line: string) => !/Market Cap:\s*[\d.]+M\b/i.test(line))
          .slice(0, 8);

        console.log(`Found ${lines.length} matching stocks`);
        lines.forEach((line: string) => console.log(line));

        const formatted = lines
          .map((line: string) => line
            .replace(/^Stock:\s*([A-Z]+)/, '<b>$1</b>')
            .replace(/Price:\s*(\$[\d.]+)/, 'Price: <b>$1</b>')
          )
          .join('\n');
        const symbols = lines
          .map((line: string) => line.match(/Stock:\s*([A-Z]+)/)?.[1])
          .filter(Boolean)
          .join(', ');
        const now = new Date().toLocaleString('zh-TW', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        const message = `🚀 <b>Strong Buy: ${symbols}</b>\n${now}\n\n${formatted}\n\nhttps://www.tradingview.com/markets/stocks-usa/market-movers-losers/`;
        await sendTelegram(message);

        return {
          success: true,
          count: lines.length,
          stocks: lines,
          liveViewUrl: `https://live.anchorbrowser.io?sessionId=${session.data.id}`,
        };
      }

      console.log("No matching stocks found");
      return { success: true, count: 0, stocks: [], message: "No matches found" };

    } finally {
      if (session?.data?.id) {
        try {
          await client.sessions.delete(session.data.id);
        } catch (cleanupError) {
          console.warn("Failed to cleanup session:", cleanupError);
        }
      }
    }
  },
});
