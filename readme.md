# HexAI

*The voice of the hexagrams, interpreted by AI.*
*（卦象之語，由 AI 解讀）*

## 項目概述

HexAI 是一個結合了 **傳統三傳占卜法** 與 **現代 AI 技術** 的網頁應用程式。使用者可以輸入公曆日期、時間（選填）以及額外的動念資訊（如數字、字母，選填），應用程式會：

目前已經可以直接使用功能網站 https://hexai-eg2.pages.dev/

1.  **前端即時計算**: 運用經典三傳演算法（基於 `calendar.js` 和 `lunar.js`），在瀏覽器端快速計算出初傳、中傳、末傳的卦象數字、名稱、五行屬性、方位、基本意象及詳細解析。如果使用者提供了額外輸入，也會進行相應的額外卦象推演。
2.  **AI 深入解讀**: 使用者可以選擇將前端計算出的完整卦象結果（包含三傳、額外分析、五行關係等）發送到後端，由 **Deepseek API** (`deepseek-chat` 模型) 進行更深入、更人性化的綜合解讀。

此應用旨在提供一個既快速準確又不失溫度與深度的線上三傳占卜體驗。應用程式透過 **Cloudflare Pages** 部署。

*最後更新時間: (請手動更新此日期)*

## 當前狀態 (Cloudflare Pages + Deepseek)

- **前端**: `index.html` (位於專案根目錄)，包含 HTML, CSS, 和 JavaScript (內含 `calendar.js` 和 `lunar.js` 的邏輯)。特色：
    - 簡潔、直觀的介面。
    - 提供輸入框供使用者輸入占卜資訊：
        - 公曆日期 (必填，日期選擇器)
        - 公曆時間 (選填，時間選擇器，默認 00:00)
        - 額外輸入 (選填，文字輸入框，支援數字 0-9 和字母 A-Z)
    - **兩個操作按鈕**: 
        - **「立即起卦」**: 觸發前端 JavaScript 進行完整的三傳計算和額外分析，並立即在頁面顯示基礎結果 (卦象數字、名稱、五行、方位、意象、解析、五行關係等)。
        - **「AI 深入解讀」**: 先執行前端計算，然後將計算結果整理後發送給後端 `/api/interpret` 端點，請求 Deepseek AI 進行詳細解讀，並將解讀結果顯示在頁面上。
    - **結果顯示區域**: 分區顯示基礎卦象結果和 AI 深入解讀結果。
- **後端 (請求處理)**: `_worker.js` (Cloudflare Worker) 處理 `/api/interpret` 的 POST 請求：
    - 接收前端發送的、已經過前端計算和格式化的 **卦象結果文本 (Prompt)**。
    - **(如果 `DEEPSEEK_API_KEY` 存在)** 將收到的 Prompt 作為使用者輸入，連同系統提示一起，呼叫 **Deepseek API** (`deepseek-chat` 模型)，要求 AI 對提供的卦象結果進行詳細解讀。
    - 將 Deepseek 返回的解讀文本回傳給前端。
    - **不執行任何三傳計算邏輯。**
    - 同時負責處理靜態資源請求 (在 Pages 環境下通常由平台處理，Worker 內主要用於本地開發 `wrangler pages dev .` 和備援)。
- **後端 (AI 模型)**:
    - **Deepseek**: 提供核心的卦象解讀能力。
- **主要資料來源**: 使用者輸入的日期、時間、額外動念資訊。
- **運行環境**: Cloudflare Pages (使用 `_worker.js`), (外部) Deepseek API。
- **部署**: 自動從 GitHub (例如 `main` 分支) 部署至 Cloudflare Pages。
- **核心功能**: 提供即時的三傳卦象計算，並可選擇性地獲取 AI 提供的深入解讀。

## 重要設定與流程

### Deepseek 整合流程 (用於 AI 解讀)

1.  **取得 API 金鑰**: 前往 Deepseek 官方網站申請 API 金鑰。
2.  **設定環境變數**: 在 Cloudflare Pages 專案設定中，添加以下環境變數：
    - `DEEPSEEK_API_KEY`: 你的 Deepseek API 金鑰 (設為 Secret)。

### Worker (`_worker.js`) 邏輯 (用於 AI 解讀)

- **請求處理**: 接收來自前端 `/api/interpret` 的 POST 請求，其中應包含一個名為 `prompt` 的 JSON 字段，其值為前端已生成的包含所有計算結果的文本。
- **提示工程 (後端)**: 後端 Worker 主要負責定義一個 `system` 角色提示，告知 Deepseek 扮演一個三傳解讀專家。然後將前端傳來的 `prompt` 作為 `user` 角色的內容。
- **API 呼叫**: 將包含 `system` 和 `user` 提示的訊息體發送給 Deepseek API (`deepseek-chat` 模型)。
- **回應處理**: 將 Deepseek 返回的解讀文本 (`interpretation`) 封裝在 JSON 中回傳給前端。

## 如何在本地運行 (使用 Wrangler)

1.  確保已安裝 Node.js 和 npm/yarn/pnpm。
2.  安裝 Wrangler CLI: `npm install -g wrangler`
3.  克隆倉庫並進入專案目錄。
4.  創建 `.dev.vars` 文件 (此文件不應提交到 Git)，並在其中設定 Deepseek 的環境變數：
    ```
    DEEPSEEK_API_KEY="YOUR_DEEPSEEK_API_KEY"
    ```
    (將引號內的內容替換為實際值)。
5.  運行本地開發伺服器: `wrangler pages dev .` (注意後面的點 '.')
6.  在瀏覽器中訪問 `http://localhost:8788` (或 Wrangler 顯示的其他端口)。

## 密鑰管理

- **生產環境**: `DEEPSEEK_API_KEY` **必須**在 Cloudflare Pages 專案的「設定」->「環境變數」中配置，並標記為 **Secret**。
- **本地開發**: 使用 `.dev.vars` 文件管理本地測試所需的密鑰。

## 技術實現細節

- **前端計算庫**: `calendar.js` (包含三傳、額外分析、五行關係計算邏輯), `lunar.js` (公曆轉農曆核心庫)。
- **前端框架**: 無特定框架，使用原生 JavaScript DOM 操作。
- **後端環境**: Cloudflare Workers。
- **AI 模型**: Deepseek API (`deepseek-chat`)。

## 未來展望

- **結果美化**: 優化前端顯示卦象和 AI 解讀結果的方式。
- **模型選擇/微調**: 測試不同的 Deepseek 模型版本或考慮微調以獲得更佳解讀效果。
- **錯誤處理**: 增強對 Deepseek API 可能返回錯誤的處理和前端提示。
- **輸入驗證**: 進一步強化前端對額外輸入格式的驗證。
- **歷史記錄**: 增加保存和查看歷史占卜結果的功能。

## 作者與支持

*   **製作者**: PONY
*   **聯絡信箱**: [liupony2000@gmail.com](mailto:liupony2000@gmail.com)
*   **特別感謝**: 荀爽 教學啟發

如果您喜歡 HexAI 並覺得它對您有幫助，可以考慮透過以下方式支持開發者繼續創作與維護：

*   **USDT (TRC20):** `TExxw25EaPKZdKr9uPJT8MLV2zHrQBbhQg`
*   **多幣種錢包 (X Payments):** `liupony2000.x`
*   **台灣帳戶 (台新銀行 812):** `20051021151002`

您的支持是持續改進的最大動力！ 