# OpenCode Wife

[English](./README.md) · [简体中文](./README.zh-CN.md) · [文件](./docs/README.md)

為 [OpenCode Desktop](https://github.com/anomalyco/opencode) 打造的 Live2D 陪伴角色 — 一個以 fork 為基礎的呈現層,讓你的開發工作有角色陪伴對話,同時不干擾工作本身。

> **Alpha 版本** — 僅限 Windows x64。安裝檔未簽章;請見[安裝](#安裝)。Side Chat 現已穩定可用;Live2D 渲染為選用功能,需要自行安裝執行環境(不會綁附任何專屬檔案)。

## 功能

- **Side Chat** — 主 Agent session 旁的第二個唯讀對話介面。可以邊讓 Agent 工作邊問專案問題;Wife session 只能用 `read` / `glob` / `grep` 工具,永遠不能寫檔或執行指令。
- **Live2D 角色** — 掛上自己的模型(`.model3.json` 資料夾),用視覺化編輯器綁定動作與表情,在側邊面板觀看角色反應。
- **易讀的對話泡泡** — 可調整高度、文字大小、顯示節奏、對比度與動畫;每個泡泡都可顯示角色名稱。
- **`/send`** — 把 Side Chat 變成可編輯的 Agent 草稿(Replace / Append / Cancel;絕不自動送出)。
- **`/clear`** — 永久刪除目前的 Wife 對話,同時保留角色、persona、模型與畫面偏好。
- **Persona** — 每個角色的名稱、稱呼方式與受長度限制的說話指令,從下一次回覆開始套用。
- **回覆選項** — 每次回答後,由獨立低成本模型產生 2–3 個簡短後續建議,以按鈕呈現。

## 畫面範例

| 回覆選項 | 傳送給 Agent |
|---|---|
| ![Demo: 回覆選項](resources/demo/Demo_Choice.gif) | ![Demo: /send](resources/demo/Demo_Send.gif) |

## 與 OpenCode 的關係

OpenCode Wife 是**衍生產品**,不是取代 OpenCode 的 fork。兩者可並行安裝,共用同一份 Agent 資料 — 但**同一時間只能執行其中一個**:

- sessions、projects、provider credentials 與 Agent 歷史持續共用。
- Wife 專屬資料(角色、persona、Live2D 路徑、Side Chat 設定、視窗狀態)只存在 Wife profile。
- 其中一個 App 執行時,啟動另一個只會聚焦已執行的 App,不會啟動第二個 backend — 絕不允許兩個 backend 同時寫入同一個資料庫。
- 在任一個 App 關閉的 session,另一個 App 立即可見,不需要重新匯入。

Side Chat 不會污染你的主 Agent transcript。它是獨立的 archived session,帶 deny-all/唯讀權限設定檔,所以它的回覆與工具不會進入 Agent 的 context。

## 安裝

1. 從 [Releases](https://github.com/RyuuMeow/opencode-wife/releases) 下載 Windows x64 安裝檔(`opencode-wife-0.1.0-alpha.1-win-x64.exe`),並驗證 SHA-256 checksum。
2. 首版未簽章:Windows SmartScreen 會顯示警告。選擇**更多資訊** → **仍要執行**。
3. 首次啟動時,Wife 會詢問是否從既有 OpenCode profile 匯入安全的 UI 偏好(之後隨時可在 **Settings → Wife → OpenCode data** 重新匯入)。

## 開始使用

### 1. 跟角色聊天

開啟 session,按 `mod+alt+w`(或標題列的 **Toggle Wife** 按鈕)開啟面板,送出訊息。角色會讀取目前 Agent 的 context,用唯讀工具回答。

面板操作:

- **左上角角色下拉選單** — 切換此 session 顯示的角色。
- **右上角滑鼠圖標** — 進入 Live2D 模型操作模式:拖曳移動模型、滾輪縮放(0.2x–3x)。此模式下聊天 UI 暫停;按 `Escape` 或再點一次圖標回到聊天。
- **對話區域滾動滑鼠滾輪** — 向上滾動展開詳細對話歷史,向下滾動收起回近期訊息。

### 2. 設定模型與 provider

- **主聊天模型**:Wife session 共用你設定的 OpenCode provider/model。
- **選項產生器**:**Settings → Wife → Reply choices** — 獨立低成本模型(預設 `opencode/deepseek-v4-flash` at `low`)建議後續回覆,不延遲主回答。
- **Persona**:**Settings → Wife → General** — 稱呼方式與說話指令。

### 3. 安裝 Live2D 執行環境

OpenCode Wife **不綁附** `live2dcubismcore.min.js` 或任何範例模型。

1. **Settings → Wife → Live2D runtime** → **開啟官方下載頁**。
2. 下載 [Live2D Cubism Web SDK](https://www.live2d.com/en/sdk/download/web/) 並接受 [Live2D 授權條款](https://www.live2d.com/en/sdk/license/)。
3. 選擇 SDK ZIP 或 `live2dcubismcore.min.js`。App 會驗證檔案、記錄版本與 SHA-256,並安裝到 Wife profile。
4. 隨時可在同一畫面替換或移除執行環境。

**Core 相容性**:內建執行環境需要具備舊版 `csmGetDrawableRenderOrders` API 的 Cubism Core。最新的 Cubism 5 SDK 改用了新名稱,安裝時會被拒絕並顯示清楚訊息 — 請改用官方 CDN 檔案(`https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js`)或較舊的 SDK 版本。

渲染需要 Live2D 模型:**Settings → Wife → Characters** 新增角色並選擇模型資料夾。官方免費的 [Hiyori 範例](https://www.live2d.com/en/learn/sample/momose-hiyori/) 是不錯的起點 — 使用前請確認其條款。匯入模型的方式見[文件](./docs/README.md)。

沒有這些東西 Side Chat 也完全正常 — 面板只會顯示 setup 狀態。

### 4. 指令

- `/send` — 把 Side Chat 總結成可編輯的 Agent 草稿。
- `/clear` — 刪除目前的 Wife 對話。

## 共用資料、更新與相容性

- **共用 Agent state**:sessions、projects 與 credentials 從與 OpenCode 相同的資料根目錄讀取。兩邊的升級都要注意:升級 OpenCode 後,Wife 可能需要同步升級,反之亦然。
- **相容性守衛**:啟動前 Wife 會檢查共用資料庫的 schema。若 OpenCode 已升級到 Wife 無法讀取的 schema,Wife 會拒絕啟動並顯示可操作的訊息 — 絕不降級或修改資料庫。
- **更新**:Wife 的自動更新在 alpha 停用。請手動查看 [Releases](https://github.com/RyuuMeow/opencode-wife/releases) 頁面。綁附的 Agent backend 永遠不會自行更新。
- **備份**:任何會修改 schema 的啟動前,會先保留共用資料庫的一致性備份(保留最近三份)。

## 隱私與安全

- Wife session **結構上唯讀**:只能用 `read` / `glob` / `grep`,沒有寫入或執行工具,沒有權限彈窗。這是伺服器端權限設定檔強制的,不是隱藏按鈕。
- 你的程式碼、prompt 與對話會送往你設定的 LLM provider — 與 OpenCode 相同的資料流。
- Live2D 模型檔案與 Cubism Core 只留在本機,不會上傳。
- Alpha 注意事項:無自動更新、安裝檔未簽章、僅 Windows x64。問題回報請到 [issue tracker](https://github.com/RyuuMeow/opencode-wife/issues);安全性問題請用 [Private Vulnerability Reporting](https://github.com/RyuuMeow/opencode-wife/security/advisories/new)。

## 從原始碼建置

```sh
bun install
bun run build          # packages/app
bunx electron-vite build  # packages/desktop
bun run package:win    # packages/desktop — Windows x64 NSIS installer
```

本機建置注意事項見 [docs/README.md](./docs/README.md),環境細節見 [docs/12-handoff.md](./docs/12-handoff.md)。

## 授權與聲明

MIT — 見 [LICENSE](./LICENSE)。OpenCode Wife 是 [OpenCode](https://github.com/anomalyco/opencode) 的獨立衍生作品;歸屬與 Live2D 商標/授權說明見 [NOTICE.md](./NOTICE.md)。

Live2D 與 Cubism 是 Live2D Inc. 的商標。本專案與 Live2D Inc. 無關,亦未獲其背書。散布本軟體不代表 Live2D 已核准其授權分類 — 請自行檢視 [Live2D SDK 授權](https://www.live2d.com/en/sdk/license/)。
