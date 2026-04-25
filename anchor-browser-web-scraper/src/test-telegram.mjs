import "dotenv/config";

const mockStocks = [
  "Stock: AAPL | Apple Inc. | Price: $189.50 | Market Cap: 2.9T | Rating: Strong Buy | Sector: Technology",
  "Stock: NVDA | NVIDIA Corp. | Price: $875.20 | Market Cap: 2.1T | Rating: Strong Buy | Sector: Technology",
  "Stock: MSFT | Microsoft Corp. | Price: $415.30 | Market Cap: 3.1T | Rating: Strong Buy | Sector: Technology",
];

async function sendTelegram(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
  });
  const json = await res.json();
  console.log("Telegram response:", json);
}

const formatted = mockStocks
  .map(line => line
    .replace(/^Stock:\s*([A-Z]+)/, '<b>$1</b>')
    .replace(/Price:\s*(\$[\d.]+)/, 'Price: <b>$1</b>')
  )
  .join('\n');
const symbols = mockStocks
  .map(line => line.match(/Stock:\s*([A-Z]+)/)?.[1])
  .filter(Boolean)
  .join(', ');
const now = new Date().toLocaleString('zh-TW', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
const message = `🚀 <b>Strong Buy: ${symbols}</b>\n${now}\n\n${formatted}\n\nhttps://www.tradingview.com/markets/stocks-usa/market-movers-losers/`;
await sendTelegram(message);
