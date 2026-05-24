# Termai 项目需求技术方案

## 一、项目定位

做一个 **单端口、多会话、多标签、进程常驻的 Termai管理器**。

核心目标：

```
浏览器关闭，Shell 不关闭
刷新页面，重新接回原来的 Shell
多个标签页，对应多个常驻会话
左侧管理会话，右侧显示终端
```

------

# 二、核心需求

## 1. 单端口访问

例如：

```
http://server:6688
```

所有功能都走一个端口：

```
Web UI
REST API
WebSocket Terminal
```

------

## 2. 多会话管理

每个会话是一个独立 Shell 进程：

```
claude-code  -> bash / claude
hermes       -> bash / hermes
routeros     -> ssh admin@192.168.88.1
ubuntu       -> bash
```

会话不跟浏览器绑定。

------

## 3. 多标签 UI

UI 布局：

```
┌────────────────────────────────────┐
│ 左侧：会话列表 │ 右侧：Shell 终端    │
│               │ 顶部：标签栏        │
│               │ 中间：xterm.js      │
│               │ 底部：状态栏        │
└────────────────────────────────────┘
```

------

# 三、推荐技术栈

## 前端

| 模块     | 技术            |
| -------- | --------------- |
| UI 框架  | React 19        |
| 终端组件 | @xterm/xterm + @xterm/addon-fit |
| 状态管理 | Zustand 5       |
| 样式     | TailwindCSS 4   |
| 构建工具 | Vite 6          |
| 通信     | WebSocket       |

推荐确认：

```
React 19 + TypeScript + Vite + Zustand + TailwindCSS
```

------

## 后端

| 模块      | 技术              |
| --------- | ----------------- |
| Web 服务  | Fastify 5         |
| PTY       | node-pty          |
| WebSocket | @fastify/websocket（原生内置） |
| API       | Fastify Router    |
| 会话存储  | SQLite（better-sqlite3，WAL 模式） |
| 进程管理  | Session Manager   |
| 构建      | tsx（watch 模式开发） / tsc（编译） |

确认：

```
Node.js + Fastify 5 + @fastify/websocket + better-sqlite3 + node-pty
```

选择理由：
- **Fastify** 替代 Express：性能 2-3x，WebSocket 原生支持，TypeScript 类型更好
- **better-sqlite3** 替代 JSON：WAL 模式支持并发读，同步 API 更简单，比 JSON 文件可靠
- **@fastify/websocket**：框架级 WebSocket 集成，无需手动管理 ws 实例

------

# 四、整体架构

```
Browser
  |
  | HTTP / WebSocket
  |
Fastify Server :6688
  |
  ├── Static Web UI (Vite build)
  ├── REST API (/api/sessions)
  ├── WebSocket (/ws/terminal?session=<id>)
  |
Session Manager (Map<id, ptyProcess>)
  |
  ├── PTY Session: claude-code  ← scrollback buffer 2000 行
  ├── PTY Session: hermes
  ├── PTY Session: routeros
  └── PTY Session: ubuntu
  |
  └── SQLite (sessions.db) ── 持久化会话元数据
```

重点：

```
WebSocket 只是连接通道
PTY Session 才是真正的 Shell
```

------

# 五、会话生命周期设计

## 正确逻辑

```
创建会话
  ↓
启动 PTY 进程
  ↓
记录 session_id / pid / cwd / command
  ↓
浏览器 attach 到这个 session
  ↓
浏览器断开
  ↓
PTY 继续运行
  ↓
下次重新 attach
```

------

## 错误逻辑，不能这样做

```
WebSocket 断开
  ↓
Shell 进程退出
```

这不符合你的需求。

------

# 六、Session 数据结构

使用 SQLite（better-sqlite3，WAL 模式）持久化会话元数据。

```json
{
  "id": "claude-code",
  "name": "Claude Code",
  "command": "bash",
  "args": [],
  "cwd": "/root/projects/claude",
  "env": {},
  "status": "running",
  "pid": 12345,
  "createdAt": "2026-05-23T10:00:00Z",
  "lastActiveAt": "2026-05-23T10:30:00Z",
  "clientCount": 1
}
```

如果是 Claude Code：

```
{
  "id": "claude-code",
  "name": "Claude Code",
  "command": "claude",
  "args": ["--dangerously-skip-permissions"],
  "cwd": "/root/projects/claude"
}
```

如果是 SSH：

```
{
  "id": "routeros",
  "name": "RouterOS",
  "command": "ssh",
  "args": ["admin@192.168.88.1"],
  "cwd": "/root"
}
```

------

# 七、核心 API 设计

## 获取会话列表

```
GET /api/sessions
```

返回完整 `SessionMeta`：

```
[
  {
    "id": "claude-code",
    "name": "Claude Code",
    "command": "bash",
    "args": [],
    "cwd": "/root/projects/claude",
    "env": {},
    "status": "running",
    "pid": 12345,
    "createdAt": "2026-05-23T10:00:00Z",
    "lastActiveAt": "2026-05-23T10:30:00Z",
    "clientCount": 1
  }
]
```

------

## 创建会话

```
POST /api/sessions
```

请求：

```
{
  "id": "claude-code",
  "name": "Claude Code",
  "command": "bash",
  "args": [],
  "cwd": "/root/projects/claude",
  "env": {}
}
```

可能错误：
- `409` — Session ID 已存在或已达上限
- `400` — 缺少必填字段（id、name、command）

------

## 删除会话

```
DELETE /api/sessions/:id
```

注意：删除才真正 kill 进程。

可能错误：
- `404` — Session 不存在

------

## 重启会话

```
POST /api/sessions/:id/restart
```

------

## WebSocket 连接终端

```
ws://server:6688/ws/terminal?session=claude-code
```

------

# 八、WebSocket 消息设计

## 前端发送输入

```
{
  "type": "input",
  "data": "ls -la\n"
}
```

## 后端返回输出

```
{
  "type": "output",
  "data": "total 48..."
}
```

## 调整终端大小

```
{
  "type": "resize",
  "cols": 120,
  "rows": 32
}
```

## 状态消息

```
{
  "type": "status",
  "status": "connected"
}
```

------

# 九、后台进程常驻方案

## 第一版

进程存在内存里：

```
Map<sessionId, ptyProcess>
```

优点：简单。

缺点：后端服务重启后，PTY 会丢。

------

## 第二版

元数据持久化到 SQLite：

服务启动后自动恢复元数据（不恢复 PTY 进程，显示为 `stopped` 状态）：

```
读取 SQLite sessions 表
恢复 session 元数据（id / name / command / cwd 等）
PTY 进程 → 标记为 stopped，等待用户手动 restart
```

这样即使重启，会话配置不会丢失，手动 restart 即可重新启动 PTY。

------

## 第三版

结合 tmux：

```
WebUI Shell
  ↓
tmux session
  ↓
真实 shell
```

这样后端重启也不影响 shell。

但第一版不建议上 tmux，复杂度会上升。

------

# 十、推荐实现路线

## MVP 第一阶段：核心能力 ✅ 已完成

目标已达成：

```
单端口 :6688
左侧会话列表
右侧 xterm.js
创建/删除 shell
WebSocket 输入输出
浏览器关闭后 shell 不退出
会话持久化（SQLite）
scrollback buffer（重连有历史）
自动重连 WebSocket
多标签页切换
```

> scrollback buffer 和自动重连是多标签切换的基础设施 — 没有它们，切换标签会丢失终端历史、断连后无法恢复。

技术实现：

```
前端：React + TypeScript + Vite + xterm.js + Zustand + TailwindCSS
后端：Fastify + @fastify/websocket + better-sqlite3 + node-pty
```

------

## 第二阶段：会话模板 ✅ 已完成

一键创建预设终端环境：

```
┌──────────────────────┐
│  Shells              │
│  🐚 Bash Shell       │
│  🪟 Command Prompt   │
│  🔷 PowerShell       │
│  AI Tools            │
│  🤖 Claude Code      │
│  Connections         │
│  🌐 SSH RouterOS     │
│  🖥️ SSH Remote       │
│  ✏️ Custom (manual)  │
└──────────────────────┘
```

功能：

```
服务器端 templates.json 定义模板
平台过滤（Windows 不显示 claude）
按分组展示（Shells / AI Tools / Connections）
点击模板一键创建 session（跳过表单）
终端底部状态栏（PID / CWD / uptime）
```

详细计划见 `docs/plan-phase2.md`

------

## 第三阶段：系统设置

UI 系统设置面板，整合所有用户偏好：

```
设置面板入口
  ├── 侧栏底部齿轮图标 ⚙️

语言设置 (i18n)
  ├── 中文 / English 切换
  ├── 前端 UI 全量翻译
  ├── 服务端错误消息翻译
  └── 语言偏好持久化（localStorage）

主题设置
  ├── 深色模式 / 浅色模式
  ├── Tailwind dark mode（class 策略）
  ├── xterm.js 主题切换（Tokyo Night / GitHub Light）
  ├── 跟随系统偏好（prefers-color-scheme）
  └── 主题偏好持久化（localStorage）
```

## 第四阶段：权限和安全

增加：

```
登录密码
Token 认证
只允许白名单命令
限制 cwd
限制用户权限
HTTPS
```

------

## 第五阶段：高级能力

```
复制粘贴优化
会话搜索
命令历史
日志回放
自动重连
终端录制
移动端适配
```

------

# 十一、项目目录建议

```
termai/
├── package.json                ← 根 workspace（concurrently 同时启动前后端）
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts            ← Fastify 入口 + REST API 路由
│       ├── config.ts           ← 配置加载（端口、auth token、会话上限）
│       ├── db.ts               ← SQLite schema + 预编译 CRUD
│       ├── session-manager.ts  ← PTY 生命周期 + scrollback + 多客户端广播
│       ├── terminal-ws.ts      ← WebSocket ↔ PTY 桥接
│       └── types.ts            ← 前后端共享类型定义
├── web/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx            ← React 入口
│       ├── App.tsx             ← 布局组合
│       ├── index.css           ← Tailwind 导入
│       ├── types.ts            ← 客户端类型
│       ├── stores/
│       │   ├── sessionStore.ts ← 会话列表 CRUD 状态
│       │   └── terminalStore.ts← 标签页管理状态
│       ├── hooks/
│       │   └── useWebSocket.ts ← WebSocket 连接 + 自动重连
│       └── components/
│           ├── Sidebar.tsx     ← 左侧会话列表 + 新建弹窗
│           ├── Tabs.tsx        ← 顶部标签栏
│           └── Terminal.tsx    ← xterm.js 包装组件
├── docs/
│   └── Termai 项目需求技术方案.md
└── CLAUDE.md
```

------

# 十二、最大技术难点

| 难点           | 说明                            |
| -------------- | ------------------------------- |
| PTY 生命周期   | shell 必须独立于浏览器存在      |
| WebSocket 重连 | 刷新后要重新 attach             |
| 多客户端连接   | 一个 session 可能被多个页面打开 |
| 终端 resize    | xterm.js 和 pty 尺寸同步        |
| 复制粘贴       | 浏览器权限和终端行为容易冲突    |
| 安全           | Web Shell 天然高危              |

------

# 十三、最终建议

你的项目建议这样定义：

```
Termai Manager
```

不是简单的 Web Terminal。

一句话技术路线：

```
前端用 xterm.js 做终端界面，后端用 node-pty 创建常驻 PTY，会话由 Session Manager 管理，WebSocket 只负责 attach，不负责决定 shell 生命周期。
```

最小可用版可以先做：

```
1 个后端端口
左侧 session 列表
右侧 xterm.js
session_id 区分 shell
断开不杀进程
手动关闭才 kill
```

这版做出来，就已经比单纯 ttyd 更符合你的 Claude Code 使用场景。