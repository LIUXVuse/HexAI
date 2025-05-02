# AI五行X手串補氣

## 項目概述

AI五行X手串補氣是一個基於使用者提供的西元出生年月日、時間（選填）及地點（選填）資訊，運用 **Deepseek API** 進行四柱八字分析的應用程式。此應用旨在分析使用者命盤中的五行缺失，並推薦適合用於補氣的手串珠類型。應用程式透過 **Cloudflare Pages** 部署。

*最後更新時間: {請填寫當前日期}*

## 當前狀態 (Cloudflare Pages + Deepseek)

- **前端**: `index.html` (位於專案根目錄)，包含 HTML, CSS, 和 JavaScript。特色：
    - 溫馨、神秘風格的介面。
    - 提供輸入框與下拉選單供使用者輸入出生資訊：
        - 西元年 (必填，數字輸入框)
        - 月 (必填，下拉選單 1-12)
        - 日 (必填，下拉選單 1-31)
        - 出生時間 (選填，文字輸入框，格式 HHMM)
        - 出生地點 (選填，文字輸入框)
    - 「幫我補氣」按鈕觸發分析。
    - 結果顯示區域用於展示 Deepseek 的分析結果。
- **後端 (請求處理)**: `_worker.js` (使用 Cloudflare Pages Advanced Mode) 處理 `/api/analyze` 請求：
    - 提供靜態前端文件 (`index.html` 等)。
    - 接收前端傳來的出生年月日、時間和地點。
    - **(如果 `DEEPSEEK_API_KEY` 存在)** 構建特定提示 (Prompt)，呼叫 **Deepseek API** (`deepseek-chat` 模型)，要求進行四柱八字分析，找出五行缺失並推薦手串類型。
    - 將 Deepseek 的回應回傳給前端。
- **後端 (AI 模型)**:
    - **Deepseek**: 提供核心的四柱八字分析與建議生成能力。
- **主要資料來源**: 使用者輸入的出生資訊。
- **運行環境**: Cloudflare Pages (使用 `_worker.js` 進階模式), (外部) Deepseek API。
- **部署**: 自動從 GitHub (`master` 分支) 部署至 Cloudflare Pages。
- **核心功能**: 根據使用者出生資訊，提供五行分析與手串推薦。

## 重要設定與流程

### Deepseek 整合流程

1.  **取得 API 金鑰**: 前往 Deepseek 官方網站申請 API 金鑰。
2.  **設定環境變數**: 在 Cloudflare Pages 專案設定中，添加以下環境變數：
    - `DEEPSEEK_API_KEY`: 你的 Deepseek API 金鑰 (設為 Secret)。

### Worker (`_worker.js`) 邏輯

- **請求處理**: 接收來自前端 `/api/analyze` 的 POST 請求，包含使用者輸入的出生資訊。
- **提示工程**: 根據接收到的資訊，構造一個詳細的 Prompt，指示 Deepseek AI 執行以下任務：
    1.  基於提供的西元年月日、時間、地點（如果提供），計算對應的農曆日期和時辰。
    2.  排出年月日時四柱干支。
    3.  分析八字命盤中的五行（金、木、水、火、土）分佈情況。
    4.  判斷命盤中相對缺失或最弱的五行。
    5.  針對缺失的五行，提出建議需要補充哪種五行能量。
    6.  推薦至少 3-5 種適合用於補充該五行的水晶或手串珠材質，並簡述原因（例如：黑曜石屬水，可補水；草莓晶屬火，可補火等）。
    7.  回應需使用繁體中文，語氣溫和專業。
- **API 呼叫**: 將構造好的 Prompt 和使用者資訊（包含在 Prompt 中）發送給 Deepseek API (`deepseek-chat` 模型)。
- **回應處理**: 將 Deepseek 返回的分析結果直接傳回給前端。

## 如何在本地運行 (使用 Wrangler)

1.  確保已安裝 Node.js 和 npm/yarn/pnpm。
2.  安裝 Wrangler CLI: `npm install -g wrangler`
3.  克隆倉庫並進入專案目錄。
4.  創建 `.dev.vars` 文件 (此文件不應提交到 Git)，並在其中設定 Deepseek 的環境變數：
    ```
    DEEPSEEK_API_KEY="YOUR_DEEPSEEK_API_KEY"
    ```
    (將引號內的內容替換為實際值)。
5.  運行本地開發伺服器: `wrangler pages dev .`
6.  在瀏覽器中訪問 `http://localhost:8788` (或 Wrangler 顯示的其他端口)。

## 密鑰管理

- **生產環境**: `DEEPSEEK_API_KEY` **必須**在 Cloudflare Pages 專案的「設定」->「環境變數」中配置，並標記為 **Secret**。
- **本地開發**: 使用 `.dev.vars` 文件管理本地測試所需的密鑰。

## 未來展望

- **結果美化**: 優化前端顯示分析結果的方式，可能加入圖示或更結構化的佈局。
- **模型選擇**: 測試不同的 Deepseek 模型版本，以獲得最佳的分析效果和成本效益。
- **錯誤處理**: 增強對 Deepseek API 可能返回錯誤的處理。
- **輸入驗證**: 強化前端對日期、時間格式的驗證。 