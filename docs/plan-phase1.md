# Termai 项目开发计划 — 第一阶段

> 文档状态：已完成（代码已交付，构建已验证通过）
> 对应版本：v0.1.1
> Node.js：24.14
> 技术栈：React 19.2 + TypeScript 5.7 + Vite 7.3.3 / Fastify 5 + better-sqlite3 + node-pty

---

## 一、阶段目标

构建一个可用的 Web 终端管理器，核心验证点：

| # | 验证点 | 验收标准 |
|---|--------|---------|
| 1 | 单端口服务 | `http://host:6688` 同时提供 UI + API + WebSocket |
| 2 | 会话持久化 | 服务重启后会话列表不丢失，可重新 attach |
| 3 | Shell 常驻 | 浏览器关闭 → Shell 继续运行 → 刷新后重新接回 |
| 4 | 多标签切换 | 同时打开多个会话，标签切换不中断 Shell |
| 5 | 终端体验 | 键盘输入、resize、scrollback、Tokyo Night 主题 |

---

## 二、技术选型与理由

### 2.1 前端

| 选型 | 版本 | 理由 |
|------|------|------|
| React | 19.2 | 最新的稳定主线，并发特性成熟 |
| Vite | 7.3.3 | 开发服务器极快，ESM 原生支持，插件生态完善 |
| TypeScript | 5.7 | 前后端共享类型定义 |
| @xterm/xterm | 5.5 | 浏览器端最成熟的终端模拟器，xterm.js 后继包 |
| @xterm/addon-fit | 0.10 | 自动适应容器尺寸变化 |
| Zustand | 5 | 轻量状态管理（~1KB），无 Provider 嵌套，适合高频更新场景 |
| TailwindCSS | 4 | CSS-in-JS 替代，utility-first，构建时消除未使用样式 |

### 2.2 后端

| 选型 | 理由 |
|------|------|
| Fastify 5 | 比 Express 快 2-3x，TypeScript 类型一级支持，@fastify/websocket 原生集成 |
| @fastify/websocket | 框架级 WebSocket 处理，无需手动管理 ws 实例和升级逻辑 |
| better-sqlite3 | 同步 API 简化代码，WAL 模式支持并发读，比 JSON 文件可靠（无写入撕裂） |
| node-pty | 跨平台 PTY 创建，Node.js 生态最成熟的伪终端库 |
| tsx | TypeScript 直接执行 + watch 模式，零配置开发体验 |

### 2.3 为什么不选

- **Express + ws**：需要手动拼 WebSocket 升级逻辑，类型支持弱，性能差 2-3x
- **JSON 文件**：并发写入有竞态风险，无 schema 约束，查询需要全量加载
- **Pinia**：Vue 生态，与 React 不兼容
- **ttyd**：不支持多会话管理，没有持久化，没有定制 UI

---

## 三、整体架构

```
┌─────────────────────────────────────────────────────────┐
│ Browser (:5173 dev / :6688 prod)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ Sidebar   │  │ Tabs     │  │ xterm.js Terminal    │  │
│  │ 会话列表  │  │ 标签栏    │  │  (TerminalView.tsx)  │  │
│  │ 新建/删除 │  │ 切换/关闭 │  │                      │  │
│  └────┬─────┘  └──────────┘  └──────────┬───────────┘  │
│       │                                  │              │
│  ┌────┴──────────────────────────────────┴───────────┐  │
│  │ Zustand Stores                                    │  │
│  │  sessionStore (会话 CRUD)                          │  │
│  │  terminalStore (标签管理)                          │  │
│  └───────────────────────────────────────────────────┘  │
│       │                           │                      │
│  HTTP │ REST               WS │ /ws/terminal             │
├───────┴───────────────────────────┴──────────────────────┤
│ Fastify Server (:6688)                                   │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ REST Routes              WebSocket Handler          │ │
│  │ GET    /api/sessions      /ws/terminal?session=<id>│ │
│  │ POST   /api/sessions       → input/resize/output    │ │
│  │ DELETE /api/sessions/:id    → scrollback replay     │ │
│  │ POST   /api/sessions/:id/restart                    │ │
│  └──────────────────┬──────────────────────────────────┘ │
│                     │                                    │
│  ┌──────────────────┴──────────────────────────────────┐ │
│  │ Session Manager (Map<string, Session>)              │ │
│  │  create() → spawn PTY, write scrollback             │ │
│  │  delete() → kill PTY, remove from DB                │ │
│  │  restart() → kill + re-spawn                        │ │
│  │  attachClient() → send scrollback, broadcast output │ │
│  │  detachClient() → remove from client set            │ │
│  └──────────────────┬──────────────────────────────────┘ │
│                     │                                    │
│  ┌──────────────────┴──────────────────────────────────┐ │
│  │ SQLite (sessions.db, WAL mode)                      │ │
│  │  sessions table: id, name, command, args, cwd,      │ │
│  │  env, status, pid, created_at, last_active_at       │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 关键数据流

**创建会话 → 打开终端：**
1. 用户点击 "+ New" → 填写表单 → POST /api/sessions
2. 服务端创建 Session → 写入 SQLite → spawn node-pty
3. 前端打开标签栏 → 发起 WebSocket 连接
4. 服务端发送 scrollback 历史 → 发送 "connected" 状态
5. xterm.js 渲染终端 → 用户开始输入

**终端 I/O 流：**
```
键盘事件 → xterm.onData() → WS { type: "input", data } → Fastify WS Handler
  → sessionManager.write() → pty.write(data)
    → pty.onData() → broadcast to all clients
      → 每个 client.send({ type: "output", data })
```

**断开 + 重连：**
```
WebSocket close → session.detachClient()
  → 2s 后前端自动重连 → WS 新连接
    → session.attachClient() → send scrollback → send "connected"
```

---

## 四、模块详细设计

### 4.1 服务端模块

#### config.ts — 配置管理

从 `config.json` 加载配置，首次运行自动生成默认文件。**注意**：配置在进程启动时加载一次（`export const config = loadConfig()`），运行期间不热重载。如需更改配置需重启服务。

关键配置项：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| port | 6688 | 服务监听端口 |
| host | 0.0.0.0 | 绑定地址 |
| authToken | null | 认证 Token（null = 不启用，后续阶段使用） |
| maxSessions | 10 | 最大会话数 |
| dbPath | ./data/sessions.db | SQLite 文件路径 |
| scrollbackSize | 2000 | 每会话 scrollback 行数 |
| webDir | ../web/dist | 前端构建产物目录 |

#### db.ts — SQLite 数据层

- WAL 模式启动（`journal_mode=WAL`）
- 预编译 SQL 语句（insertStmt 复用）
- 提供 5 个函数：`upsertSession`、`updateSessionStatus`、`getSession`、`getAllSessions`、`deleteSession`

Schema：

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  command TEXT NOT NULL,
  args TEXT NOT NULL DEFAULT '[]',       -- JSON 数组
  cwd TEXT NOT NULL DEFAULT '/root',
  env TEXT NOT NULL DEFAULT '{}',         -- JSON 对象
  status TEXT NOT NULL DEFAULT 'stopped', -- running | stopped | error
  pid INTEGER,
  created_at TEXT NOT NULL,
  last_active_at TEXT NOT NULL
);
```

#### session-manager.ts — 核心业务逻辑

状态机：

```
stopped ──create()──▶ running ──delete()──▶ [removed]
                        │
                  restart() ──▶ kill → re-spawn → running
                        │
                  进程崩溃 ──▶ stopped (自动感知)
```

关键职责：

- **`create(cfg)`**：校验唯一性 + 上限 → 创建 meta → 写入 DB → 启动 PTY
- **`delete(id)`**：kill PTY → 从 Map 移除 → 删除 DB 记录
- **`restart(id)`**：kill PTY → 清空 scrollback → 重新 spawn
- **`write(id, data)`**：写入 PTY stdin，更新 lastActiveAt
- **`resize(id, cols, rows)`**：同步终端尺寸
- **`attachClient(id, client)`**：加入 broadcast 集合 → 发送 scrollback → 发送 "connected"
- **`detachClient(id, client)`**：从集合移除（不 kill 进程）

Scrollback 实现：

```
session.scrollback.push(chunk)
if (length > config.scrollbackSize) shift()
```
环形缓冲区语义（用 Array + shift 模拟，2000 行时性能可忽略）。

#### terminal-ws.ts — WebSocket 处理

路由：`/ws/terminal?session=<id>`

消息路由表：

| 客户端发送 | 服务端处理 | 服务端回复 |
|-----------|-----------|-----------|
| `{ type: "input", data }` | `session.write(id, data)` | —（通过 PTY onData 回复 output） |
| `{ type: "resize", cols, rows }` | `session.resize(id, cols, rows)` | — |
| — | attach 时 | `{ type: "output", data }` × N（scrollback） |
| — | attach 成功 | `{ type: "status", status: "connected" }` |
| — | PTY 退出 | `{ type: "status", status: "process_exited" }` |
| — | session 无效 | `{ type: "error" }` + close |

连接生命周期：

```
connection open → 校验 session → attach
  → message → route
  → close → detach
  → error → detach
```

#### index.ts — Fastify 入口

插件注册顺序：

1. `@fastify/cors` — 开发时允许跨域
2. `@fastify/websocket` — WebSocket 支持
3. `registerTerminalWS()` — WS 路由
4. `@fastify/static` — 生产环境托管前端静态文件
5. REST 路由 — `/api/sessions`

启动逻辑：

```
1. 加载 config
2. 注册所有插件和路由
3. fastify.listen({ port, host })
4. 如果端口被占用 → 错误退出（不自动 fallback）

**POST /api/sessions 返回值注意点：**
路由处理不直接返回 `create()` 返回的内部 `Session` 对象，而是通过 `sessionManager.list()` 重新查询后返回 `SessionMeta`，确保不暴露 `pty`、`scrollback` 等内部字段。
```

### 4.2 前端模块

#### stores/terminalStore.ts — 标签管理

状态结构：

```typescript
interface TerminalState {
  activeSessionId: string | null;
  tabs: Array<{ sessionId: string; name: string }>;
}
```

操作：

| 操作 | 行为 |
|------|------|
| openTab | 如果 tab 已存在则仅切换 activeSessionId；否则新建 tab 并设为 active |
| closeTab | 移除 tab；如果关闭的是当前 tab，自动切换到最后一个 tab 或 null |
| setActiveTab | 切换 activeSessionId（不涉及 WS 重连，TerminalView 的 key 驱动重渲染） |

#### stores/sessionStore.ts — 会话数据

- `fetchSessions()` — GET /api/sessions，每 5 秒自动轮询
- `createSession(req)` — POST，成功后刷新列表
- `deleteSession(id)` — DELETE，直接从本地列表移除（乐观更新）
- `restartSession(id)` — POST

错误处理：所有请求将错误消息写入 `error` 字段，组件层显示。

#### hooks/useWebSocket.ts — WebSocket 连接管理

关键实现：

- **自动重连**：`onclose` 后 2 秒 timer 重新连接（无限重试，直到 sessionId 变化或组件卸载）
- **Callback refs**：使用 `useRef` 保持回调引用，避免 useEffect 重依赖导致重连
- **生命周期**：`sessionId` 为 null 时断开，切换 sessionId 时先断开旧连接再建新连接
- **消息解析**：JSON parse，仅处理 `output` / `status` / `error` 三种类型，非 JSON 消息静默忽略
- **WS 协议**：前端自动判断 `wss:` / `ws:` 协议

边缘情况：

| 场景 | 处理 |
|------|------|
| 服务端未启动 | WebSocket 连接失败 → onerror + onclose → 2s 后重试 |
| 中间断网 | onclose 触发 → 持续重连，恢复后 scrollback 补齐 |
| session 被删除 | 服务端返回 error 并关闭连接 → 前台状态更新 |
| 快速切换 tab | 旧 WS 关闭 → 新 WS 建立 → 中间不会有残留连接 |

#### components/Terminal.tsx — xterm.js 包装

初始化流程：

```
containerRef ready
  → new XTerm(options)
  → new FitAddon → term.loadAddon(fitAddon)
  → term.open(container)
  → fitAddon.fit()
  → ResizeObserver attach
  → term.onData → send({ type: "input" })
  → cleanup: observer.disconnect() + term.dispose()
```

使用 `useEffect` 返回的 cleanup 清理 xterm 实例，每次 sessionId 变化时销毁旧实例创建新实例。

Resize 策略：

```
ResizeObserver callback
  → clearTimeout(resizeTimer)
  → setTimeout(fit, 100)  // debounce 100ms
    → fitAddon.fit()
    → proposeDimensions → send({ type: "resize", cols, rows })
```

主题：Tokyo Night 配色方案（16 色全定义 + 背景 `#1a1b26` + 前景 `#a9b1d6`）

#### components/Tabs.tsx — 标签栏

- 无标签时显示引导文字 "Select a session from the sidebar"
- 标签显示 session name + 关闭按钮（×）
- active 标签背景灰色高亮，其余为半透明
- 点击标签切换 activeSessionId，TerminalView 通过 `key={sessionId}` 驱动 WS 重新连接
- 关闭按钮的 `stopPropagation` 防止误触标签切换

#### components/Sidebar.tsx — 会话列表

状态：

- **loading**：首次加载时显示 "Loading..."
- **error**：fetch 失败时在错误字段展示，组件消费
- **empty**：无会话时显示引导文字
- **active**：当前选中的 session 高亮（蓝色背景）
- **status indicator**：绿色圆点（running）/ 灰色圆点（stopped）

新建弹窗（Modal）：

- 4 个输入字段：id（必填）、name（必填）、command（默认 bash）、cwd（选填）
- 表单提交后关闭弹窗，不清除 session 选择状态

---

## 五、API 规格

### REST

```
GET  /api/sessions              → 200 SessionMeta[]
POST /api/sessions              → 201 SessionMeta | 400/409 { error }
DELETE /api/sessions/:id        → 204 | 404 { error }
POST /api/sessions/:id/restart  → 200 { status: "restarted" } | 404 { error }
```

### WebSocket

```
Endpoint: ws://host/ws/terminal?session=<id>
Protocol: JSON text frames
```

---

## 六、数据流时序

### 正常操作：创建并连接会话

```
User         React            Fastify           SQLite        node-pty
 │              │                │                 │              │
 ├─ 点击"New" ─▶                │                 │              │
 │  填写表单 ──▶                │                 │              │
 │              ├─ POST /api/sessions ───────────▶│              │
 │              │                ├─ INSERT ──────▶│              │
 │              │                ├─ spawn(bash) ───────────────▶│
 │              │◀─ 201 + meta ──│                 │              │
 │◀─ 看到侧栏 ──│                │                 │              │
 │  点击会话 ──▶│                │                 │              │
 │              ├─ WS connect: session=mybash ──▶│              │
 │              │                ├─ send scrollback              │
 │              │                ├─ send status:connected        │
 │◀─ 看到终端 ──│                │                 │              │
 │  输入"ls\n"─▶├─ {input,ls\n}─▶│                 │              │
 │              │                ├─ pty.write("ls\n") ─────────▶│
 │              │                │◀─ pty.onData("total...") ────│
 │              │◀─ {output,total...}                            │
 │◀─ 看到输出 ──│                │                 │              │
```

### 异常场景：浏览器刷新

```
Browser Close                     Fastify            node-pty
 │                                   │                  │
 ├─ WS onclose ────────────────────▶│                  │
 │                  detachClient()  │  PTY 继续运行     │
 │                                   │                  │
 ├── 用户刷新页面 ───▶               │                  │
 │    GET /api/sessions ──────────▶ │                  │
 │◀── [meta: status=running] ──────│                  │
 │                                   │                  │
 │    WS connect ──────────────────▶│                  │
 │                  attachClient()  │                  │
 │      ← scrollback 2000 lines     │                  │
 │      ← status:connected          │  PTY 仍在运行    │
 │      ← 可以继续输入               │                  │
```

---

## 七、边缘情况与异常处理

| 场景 | 预期行为 | 实现位置 |
|------|---------|---------|
| 创建已存在的 session id | 返回 409 + 错误消息 | session-manager.create() |
| 超过 maxSessions | 返回 409 + 错误消息 | session-manager.create() |
| 删除正在输入的 session | kill PTY → 前端 WS 收到 close → tab 自动关闭 | session-manager.delete() + WebSocket onclose |
| PTY 进程异常退出 | status 变 stopped → 通知所有客户端 → 侧栏灰色圆点 | session-manager.ts pty.onExit() |
| Resize 时容器不可见 | fitAddon.fit() 抛出异常 → catch 忽略 | Terminal.tsx fit() |
| WebSocket 发送时连接已断开 | 捕获异常，从 client 集合移除 | session-manager.ts pty.onData() 和 onExit() 中的 try/catch |
| 快速连续 resize | 100ms debounce，只发送最后一次尺寸 | Terminal.tsx ResizeObserver |
| 服务端 JSON 解析失败 | 返回 error 消息，不关闭连接 | terminal-ws.ts try/catch |
| 前端接收到非 JSON 消息 | 忽略，仅处理 JSON text frames | useWebSocket.ts try/catch |
| 多个 tab 同时打开同一 session | 共享 PTY，输出广播给所有客户端 | session-manager.ts session.clients Set |
| 生产环境 web/dist 不存在 | `@fastify/static` 不注册，API 和 WS 仍正常工作 | server/index.ts existsSync 检查 |

---

## 八、目录结构与文件职责

```
termai/
├── package.json                   根 workspace，concurrently 启动前后端
├── CLAUDE.md                      项目指引（给 Claude Code 读取）
│
├── server/                        Fastify 后端
│   ├── package.json               dependencies: fastify, @fastify/websocket,
│   │                                  @fastify/cors, @fastify/static,
│   │                                  better-sqlite3, node-pty
│   ├── tsconfig.json              target ES2022, ESNext module
│   └── src/
│       ├── index.ts               入口：插件注册、REST 路由、server.start()
│       ├── config.ts              配置加载（config.json 自动生成）
│       ├── db.ts                  SQLite 初始化 + 预编译 CRUD
│       ├── session-manager.ts     PTY 生命周期、scrollback、客户端管理
│       ├── terminal-ws.ts         WebSocket 路由、消息分发
│       └── types.ts               SessionMeta、WS 消息类型定义
│
├── web/                           React 前端
│   ├── package.json               dependencies: react, xterm, zustand
│   ├── tsconfig.json              JSX react-jsx, noEmit
│   ├── vite.config.ts             代理 /api → :6688
│   ├── index.html                 入口 HTML
│   └── src/
│       ├── main.tsx               ReactDOM.createRoot
│       ├── App.tsx                布局组合：Sidebar + Tabs + Terminal
│       ├── index.css              Tailwind @import
│       ├── types.ts               客户端类型定义（与 server 同步）
│       ├── stores/
│       │   ├── sessionStore.ts    Zustand：会话 CRUD + 轮询
│       │   └── terminalStore.ts   Zustand：标签管理
│       ├── hooks/
│       │   └── useWebSocket.ts    WebSocket 连接 + 2s 自动重连
│       └── components/
│           ├── Sidebar.tsx        左侧面板：会话列表 + 新建弹窗
│           ├── Tabs.tsx           顶部标签栏
│           └── Terminal.tsx       xterm.js 包装 + ResizeObserver
│
└── docs/
    ├── Termai 项目需求技术方案.md  原始需求文档（已更新）
    └── plan-phase1.md             本文件
```

---

## 九、运行说明

### 开发环境

```bash
# 1. 安装依赖
cd server && npm install
cd ../web && npm install
cd ..

# 2. 同时启动前后端（推荐）
npm run dev
# 前端 :5173（Vite dev server，自动代理 API 到 :6688）
# 后端 :6688（Fastify API + WebSocket）

# 或分别启动
npm run dev:server    # tsx watch → :6688
npm run dev:web       # Vite dev → :5173
```

### 生产构建

```bash
npm run build    # 编译 server + 构建 web
npm start        # Fastify 启动，托管 web/dist 静态文件
```

### 配置

首次启动自动生成 `server/config.json`：

```json
{
  "port": 6688,
  "host": "0.0.0.0",
  "authToken": null,
  "maxSessions": 10,
  "dbPath": "./data/sessions.db",
  "scrollbackSize": 2000,
  "webDir": "../web/dist"
}
```

---

## 十、第一阶段交付清单

| # | 交付物 | 状态 |
|---|--------|------|
| 1 | 需求技术方案文档 | ✅ |
| 2 | 第一阶段开发计划（本文档） | ✅ |
| 3 | Fastify 服务端（config / db / session-manager / ws / routes） | ✅ |
| 4 | React 前端（stores / hooks / components / App） | ✅ |
| 5 | 项目配置文件（package.json / tsconfig / vite.config / tailwind） | ✅ |
| 6 | CLAUDE.md 项目指引 | ✅ |

**功能验证清单：**

- [x] `GET /api/sessions` 返回会话列表
- [x] `POST /api/sessions` 创建会话并启动 PTY
- [x] `DELETE /api/sessions/:id` 删除会话并 kill 进程
- [x] `POST /api/sessions/:id/restart` 重启会话
- [x] WebSocket 连接终端，输入输出正常
- [x] 浏览器关闭后 PTY 继续运行
- [x] 刷新页面后 scrollback 历史补齐
- [x] 多个标签页同时打开不同 session
- [x] 标签切换不中断 Shell
- [x] 服务重启后会话列表从 SQLite 恢复
- [x] 服务重启后已恢复的会话状态为 `stopped`（PTY 无法跨进程持久化，需手动 restart）
- [x] 前后端 TypeScript 编译零错误
- [x] Vite 生产构建通过（45 modules, 759ms）
- [x] 服务启动时自动创建 config.json

---

## 十一、已知限制（不纳入第一阶段）

| 限制 | 原因 | 计划阶段 |
|------|------|---------|
| 无认证机制 | 降低 MVP 复杂度，默认监听 0.0.0.0 需自行 Nginx 反代加密码 | 阶段四 |
| 无会话模板 | 需要配置文件系统支持 | 阶段三 |
| 无命令历史 / 日志回放 | 需要持久化终端输出到文件 | 阶段五 |
| 无多客户端输入协调 | 多客户端输入共享 stdin，不做隔离 | 已知行为 |
| 节点崩溃后 PTY 丢失 | SQLite 可恢复 meta，但无法恢复原进程，需 tmux 方案 | 阶段五 |
| 无移动端适配 | xterm.js 在触屏上体验差 | 阶段五 |

### 已修复问题

| 问题 | 修复说明 |
|------|---------|
| 服务重启后会话状态显示为 running（实际 PTY 不存在） | `restoreSessions()` 强制设 `stopped` + 写回 DB |
| `session-manager.ts` 继承 `EventEmitter` 但不 emit 事件 | 移除 `extends EventEmitter`、`super()`、对应 import |
| 未使用的 `zod` 依赖 | 从 server/package.json 移除 |
| 未使用的 `SessionMeta` import | 从 server/index.ts 移除 |
| `??` 和 `\|\|` 混用不加括号 | `cwd ?? (process.env.HOME \|\| "/root")` |
| 前端 `.ts` 扩展名 import 报错 | web/tsconfig.json 添加 `allowImportingTsExtensions` |
| `useRef<...>()` 无初始值 | 改为 `useRef<... \| undefined>(undefined)` |
| 缺少 `@types/ws` | 安装到 devDependencies |
| `allowProposedApi` 废弃选项 | 从 Terminal.tsx 移除 |
