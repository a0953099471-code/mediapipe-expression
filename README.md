# MediaPipe 表情辨識（純前端）

簡介：一個使用 MediaPipe Face Mesh（臉部 Landmark）與 Web Speech API 的純前端網頁應用，能在瀏覽器中即時偵測表情並語音回饋。

快速啟動

1. 在本機啟動簡單靜態伺服器（以 Python 為例）：

```bash
# Python 3
python -m http.server 8000
```

2. 在瀏覽器開啟 `http://localhost:8000`，允許攝影機權限後，按下「啟動偵測」。

部署

- 可直接將專案上傳至 GitHub（Pages）或 Vercel 做靜態網站部署。

注意事項

- MediaPipe 的 Landmark 索引與瀏覽器取到的值可能因版本而異；本範例使用簡易啟發式判斷，若要提升準確度可依需求調校閾值或使用機器學習模型做分類。
- 若手機上無法自動開啟相機，請確認使用 HTTPS 或在本機（localhost）測試。
test
