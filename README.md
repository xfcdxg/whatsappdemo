# WhatsApp + LINE CRM Integration Demo

这是一个用于演示 CRM 系统对接 WhatsApp 与 LINE 的小型 Node.js 服务，支持 Mock/Real 两种模式，并提供可视化页面用于发送消息、模板消息、获取用户资料、广播以及查看统一收件箱（Webhook 日志）。

## 1. 环境要求

- Node.js 18+（建议 20+）
- npm

## 2. 启动步骤

1) 安装依赖：

```bash
npm install
```

2) 配置环境变量（二选一）：

- 方式 A：直接使用 Mock（推荐先跑通）
  - 不需要配置任何 Token，保持 `.env` 为空或不设置相关变量即可
- 方式 B：使用真实账号（Real 模式）
  - 复制 `.env.example` 为 `.env` 并填写变量（见下一节）

3) 启动服务：

```bash
npm start
```

启动后访问：

- Web UI：`http://localhost:3000`
- 状态接口：`http://localhost:3000/status`

## 3. 配置说明（Mock / Real）

项目默认会根据配置自动进入 Mock 或 Real：

- WhatsApp
  - Mock 条件：未配置 `WHATSAPP_API_TOKEN` 或 `WHATSAPP_PHONE_NUMBER_ID`
- LINE
  - Mock 条件：未配置 `LINE_CHANNEL_ACCESS_TOKEN` 或 `LINE_CHANNEL_SECRET`

可配置项见 [.env.example](file:///Users/zhouq/Documents/Sundear/_git/whatsappdemo/.env.example)：

```ini
PORT=3000

WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=

LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
```

页面上每个渠道卡片右上角的 Settings 也支持“运行时配置覆盖”（不改 .env、无需重启）：

- WhatsApp：API Token / Phone ID
- LINE：Channel Access Token

## 4. 页面操作步骤（Web UI）

页面在 [index.html](file:///Users/zhouq/Documents/Sundear/_git/whatsappdemo/src/public/index.html) 中实现，包含 3 个 Tab：

### 4.1 WhatsApp CRM

- Send Message
  - 填写 To（手机号）与 Text Message
  - 点击 Send Text
- CRM Advanced Features / Send Template Message
  - 填写 To（手机号）、Template Name、Lang Code
  - 点击 Send Template
  - Mock 模式会返回 mock 的 messageId；Real 模式会请求 Meta Graph API

### 4.2 LINE CRM

- Send Message
  - 填写 To（User ID）与 Text Message
  - 点击 Send Text
- Get User Profile
  - 输入 User ID
  - 点击 Fetch Profile
- Broadcast Message
  - 输入广播文案
  - 点击 Send Broadcast
  - Real 模式调用 LINE 的 broadcast API；Mock 模式返回 mock 结果
  - 注意：Broadcast 需要账号具备相应权限/套餐能力，否则真实请求会被 LINE 拒绝

### 4.3 Unified Inbox（Webhook Log）

- 用于查看统一收件箱（合并 WhatsApp/LINE 的入站 webhook 与出站发送日志）
- 服务启动时会默认塞入几条 mock 日志，便于页面有初始内容（见 [store.js](file:///Users/zhouq/Documents/Sundear/_git/whatsappdemo/src/store.js)）

## 5. Webhook 对接与调试

Webhook 路由位于 [webhooks.js](file:///Users/zhouq/Documents/Sundear/_git/whatsappdemo/src/routes/webhooks.js)。

### 5.1 WhatsApp Webhook

- 验证（Meta 会发起 GET 校验）：
  - `GET /webhooks/whatsapp`
  - 参数：`hub.mode` / `hub.verify_token` / `hub.challenge`
  - `hub.verify_token` 需与 `.env` 中 `WHATSAPP_VERIFY_TOKEN` 一致

- 事件接收：
  - `POST /webhooks/whatsapp`
  - 收到消息后会写入统一收件箱

### 5.2 LINE Webhook

- 事件接收：
  - `POST /webhooks/line`
  - 若配置了 `LINE_CHANNEL_SECRET`，会校验 Header `x-line-signature`
  - 校验通过后写入统一收件箱
  - 收到 message 类型事件时，会自动回复 `Echo: ...`（用于验证连通性）

本地调试建议配合 ngrok 之类工具将 `http://localhost:3000` 暴露到公网，然后把 webhook URL 配置到各平台后台。

## 6. API 接口列表（给 CRM 系统调用）

所有 API 都在 `/api` 前缀下（见 [api.js](file:///Users/zhouq/Documents/Sundear/_git/whatsappdemo/src/routes/api.js)）。

- `GET /status`：查看服务状态与当前 Mock/Real 模式
- `GET /api/messages`：读取统一收件箱消息列表（内存存储）

WhatsApp：

- `POST /api/send-whatsapp`：发送文本消息
  - body: `{ "to": "...", "text": "...", "config": { "apiToken"?, "phoneNumberId"? } }`
- `POST /api/send-whatsapp-template`：发送模板消息
  - body: `{ "to": "...", "templateName": "...", "language": "en_US", "config": { "apiToken"?, "phoneNumberId"? } }`

LINE：

- `POST /api/send-line`：推送文本消息（push）
  - body: `{ "to": "...", "text": "...", "config": { "channelAccessToken"? } }`
- `POST /api/send-line-broadcast`：广播消息（broadcast）
  - body: `{ "text": "...", "config": { "channelAccessToken"? } }`
- `POST /api/line/profile`：获取用户资料
  - body: `{ "userId": "...", "config": { "channelAccessToken"? } }`
- `POST /api/line/token`：用 channelId + channelSecret 换取 access token（演示用途）
  - body: `{ "channelId": "...", "channelSecret": "..." }`

## 7. 常见问题

- 端口占用（EADDRINUSE: 3000）
  - 说明 3000 被其他进程占用，先停止占用端口的进程或修改 `.env` 中 `PORT`
- LINE Broadcast 报错：`X-Line-Retry-Key parameter is invalid`
  - 必须是 UUID；当前实现已使用 `crypto.randomUUID()` 生成（见 [line.js](file:///Users/zhouq/Documents/Sundear/_git/whatsappdemo/src/services/line.js)）

