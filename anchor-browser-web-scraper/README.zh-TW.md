## 快速開始（本地端執行）

```bash
# 1. 複製專案並進入目錄
git clone https://github.com/triggerdotdev/trigger-dev-examples.git
cd trigger-dev-examples/anchor-browser-web-scraper

# 2. 安裝相依套件
npm install

# 3. 複製環境變數範本並填入 API 金鑰
cp .env.example .env
```

編輯 `.env`，填入您的 API 金鑰：

```
TRIGGER_API_KEY=tr_dev_your_trigger_api_key_here
ANCHOR_BROWSER_API_KEY=sk-your_anchor_browser_api_key_here
```

```bash
# 4. 啟動 Trigger.dev 開發伺服器
npx trigger.dev@latest dev
```

---

### 專案設定

本範例展示如何使用 Trigger.dev 的排程功能與 Anchor Browser 的 AI 瀏覽器自動化工具，進行自動化網頁監控。此專案每天東部時間下午 5 點執行，尋找當天百老匯演出的最低票價。

##### 運作原理：

1. Trigger.dev 排程並執行監控任務
2. Anchor Browser 啟動一個帶有 AI 代理的遠端瀏覽器工作階段
3. AI 代理使用電腦視覺與自然語言處理來分析 [TDF 網站](https://www.tdf.org/discount-ticket-programs/tkts-by-tdf/tkts-live/)
4. AI 代理回傳最低價格的演出及其詳細資訊：名稱、價格與演出時間

#### 前置需求

在開始撰寫程式碼之前，您需要準備：

- Node.js（版本 16 或以上）
- Trigger.dev 帳號 - 至 https://trigger.dev 註冊免費方案
- Anchor Browser API 存取權限 - 從 [Anchor Browser 儀表板](https://anchorbrowser.io)取得您的 API 金鑰

#### 安裝相依套件

初始化一個新的 Node.js 專案，並安裝 Anchor Browser 和 Trigger.dev 所需的套件：

```
npm init -y
npm install anchorbrowser
npx trigger.dev@latest init -p <your-project-id>
```

#### 環境設定

在專案根目錄建立 .env 檔案，填入以下環境變數：

```
# Trigger.dev 設定
TRIGGER_API_KEY=tr_dev_your_trigger_api_key_here

# Anchor Browser 設定
ANCHOR_BROWSER_API_KEY=sk-your_anchor_browser_api_key_here
```

請確保將 .env 加入 .gitignore，以保護您的 API 金鑰安全：

```
echo ".env" >> .gitignore
```

由於 Anchor Browser 底層使用瀏覽器自動化函式庫，我們需要設定 Trigger.dev 以正確處理這些相依套件，並將它們排除在建構套件之外。

設定 Trigger.dev 的 trigger.config.ts 以支援瀏覽器自動化相依套件：

```
import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: "proj_your_project_id_here", // 從 Trigger.dev 儀表板取得
  maxDuration: 3600, // 1 小時 - 網頁自動化的充裕時間
  dirs: ["./src/trigger"],
  build: {
    external: [
      "playwright-core",
      "playwright",
      "chromium-bidi"
    ]
  }
});
```

### 核心監控任務

在您的 trigger.dev 函式子資料夾中建立新檔案 [src/trigger/broadway-monitor.ts](src/trigger/broadway-monitor.ts)。以下是每天東部時間下午 5 點執行的百老匯票價監控任務：

```
import { schedules } from "@trigger.dev/sdk";
import Anchorbrowser from 'anchorbrowser';

export const broadwayMonitor = schedules.task({
  id: "broadway-ticket-monitor",
  cron: "0 21 * * *",
  run: async (payload, { ctx }) => {
    const client = new Anchorbrowser({
      apiKey: process.env.ANCHOR_BROWSER_API_KEY!,
    });

    let session;
    try {
      // 建立明確的工作階段以取得即時檢視 URL
      session = await client.sessions.create();
      console.log(`工作階段 ID: ${session.data.id}`);
      console.log(`即時檢視 URL: https://live.anchorbrowser.io?sessionId=${session.data.id}`);

      const response = await client.tools.performWebTask({
        sessionId: session.data.id,
        url: "https://www.tdf.org/discount-ticket-programs/tkts-by-tdf/tkts-live/",
        prompt: `Look for the "Broadway Shows" section on this page. Find the show with the absolute lowest starting price available right now and return the show name, current lowest price, and show time. Be very specific about the current price you see. Format as: Show: [name], Price: [exact current price], Time: [time]`
      });

      console.log("原始回應:", response);

      const result = response.data.result?.result || response.data.result || response.data;

      if (result && typeof result === 'string' && result.includes('Show:')) {
        console.log(`🎭 找到最佳百老匯優惠！`);
        console.log(result);

        return {
          success: true,
          bestDeal: result,
          liveViewUrl: `https://live.anchorbrowser.io?sessionId=${session.data.id}`
        };
      } else {
        console.log("今日未找到百老匯優惠");
        return { success: true, message: "未找到優惠" };
      }

    } finally {
      if (session?.data?.id) {
        try {
          await client.sessions.delete(session.data.id);
        } catch (cleanupError) {
          console.warn("清理工作階段失敗:", cleanupError);
        }
      }
    }
  },
});
```

從專案根目錄執行 Trigger.dev 開發伺服器以註冊您的新任務：

```
npx trigger.dev@latest dev
```

### 深入了解

- [Trigger.dev 文件](https://trigger.dev/docs) - 了解 Trigger.dev
- [Anchor Browser 文件](https://docs.anchorbrowser.io/introduction) - 了解 Anchor Browser
