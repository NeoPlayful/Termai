# Termai Manager

> 单端口、多会话、多标签、进程常驻的 Web 终端管理器

浏览器关闭，Shell 不关闭。刷新页面，重新接回原来的 Shell。

---

## 功能特性

- **多会话管理** — 同时运行多个独立 Shell 进程（bash、cmd、powershell、ssh 等）
- **多标签终端** — 基于 xterm.js 的终端，支持标签切换不中断 Shell
- **进程常驻** — 关闭浏览器窗口不会 Kill Shell，刷新后自动重连
- **会话持久化** — 服务重启后会话列表从 SQLite 恢复
- **Scrollback** — 重连后补齐历史输出，终端不会空白
- **单端口部署** — 一个端口同时提供 API、WebSocket 和前端 UI

## 快速开始

### 前置要求

- Node.js >= 22
- npm

### 安装

```bash
cd server && npm install
cd ../web && npm install
cd ..
```

### 开发模式

```bash
npm run dev
```

前端开发服务器（Vite HMR）：`http://localhost:5173`  
后端 API + WebSocket：`http://localhost:6688`

### 生产构建

```bash
npm run build
npm start
```

生产环境访问：`http://localhost:6688`

---

## 架构

```
Browser ──HTTP/WS──▶ Fastify Server :6688 ──node-pty──▶ PTY Sessions
                        ↕
                     SQLite (sessions.db)
```

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite 7 |
| 终端 | @xterm/xterm + @xterm/addon-fit |
| 状态管理 | Zustand 5 |
| 后端 | Fastify 5 + TypeScript |
| PTY | node-pty |
| 持久化 | better-sqlite3（WAL 模式） |
| 样式 | TailwindCSS 4 |

### 核心设计原则

1. **PTY 生命周期独立于浏览器** — WebSocket 断开不 Kill Shell，仅 DELETE 操作才终止进程
2. **WebSocket 只是连接通道** — 负责在浏览器和 PTY 之间转发 I/O，不决定 Shell 生命周期
3. **多客户端共享** — 一个会话可同时被多个浏览器标签页连接，输出广播给所有客户端

---

## API

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/sessions` | 获取会话列表 |
| POST | `/api/sessions` | 创建新会话 |
| DELETE | `/api/sessions/:id` | 删除会话（Kill 进程） |
| POST | `/api/sessions/:id/restart` | 重启会话 |
| WS | `/ws/terminal?session=<id>` | 连接终端 |

## 项目结构

```
termai/
├── package.json              ← 根 workspace
├── server/                   ← Fastify 后端
│   └── src/
│       ├── index.ts          ← 入口 + REST 路由
│       ├── config.ts         ← 配置管理
│       ├── db.ts             ← SQLite CRUD
│       ├── session-manager.ts ← PTY 生命周期管理
│       ├── terminal-ws.ts    ← WebSocket 桥接
│       └── types.ts          ← 类型定义
├── web/                      ← React 前端
│   └── src/
│       ├── App.tsx           ← 布局
│       ├── stores/           ← Zustand 状态管理
│       ├── hooks/            ← WebSocket 连接
│       └── components/       ← 终端、标签、侧栏
└── docs/                     ← 设计文档
```

## 开发路线

- ✅ **第一阶段** — 核心能力（单端口、会话管理、多标签终端）
- ⬜ **第二阶段** — 会话模板（预设模板、一键创建、状态栏）
- ⬜ **第三阶段** — 权限和安全
- ⬜ **第四阶段** — 高级能力

## 许可证

MIT
