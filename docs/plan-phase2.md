# Termai 项目开发计划 — 第二阶段：会话模板

> 文档状态：规划中
> 对应版本：v0.2.0
> 前置条件：第一阶段已完成（单端口服务、会话管理、多标签终端）

---

## 一、阶段目标

提供**开箱即用的会话模板**，用户无需每次都手动填写命令参数，点击即可创建常用 Shell 环境。

### 核心验证点

| # | 验证点 | 验收标准 |
|---|--------|---------|
| 1 | 模板配置 | 服务端 `templates.json` 定义预设模板，启动时自动加载 |
| 2 | UI 模板选择 | 新建会话时可选模板，自动填充表单字段 |
| 3 | 一键创建 | 点击模板直接创建并打开会话（跳过表单） |
| 4 | 模板编辑 | 用户可通过配置文件增删改模板，重启生效 |
| 5 | 状态栏增强 | 终端底部显示会话元信息（PID、运行时间、CWD） |

---

## 二、整体架构变化

```
Phase 1 架构：
  Sidebar → "+ New" → 弹窗手工填 id/name/command/cwd

Phase 2 架构：
  Sidebar → "+ New" → 显示模板列表（点击即创建）
                        ↓
                   手工填写 ↕ 模板选择器
                        ↓
                  也可从模板列表直接点击创建
```

### 新增/修改模块

| 模块 | 新增/修改 | 说明 |
|------|----------|------|
| `server/src/templates.ts` | 新增 | 模板加载 + 按平台过滤 + REST 路由 |
| `server/config.json` | 新增字段 | 增加 `templatesPath` 配置项 |
| `server/templates.json` | 新增 | 默认模板定义文件 |
| `web/src/stores/templateStore.ts` | 新增 | 模板列表状态管理（含 `fetchTemplates()`） |
| `web/src/components/Sidebar.tsx` | 修改 | 新建弹窗增加模板选择器 |
| `web/src/components/TemplatePicker.tsx` | 新增 | 模板选择面板（点击即创建） |
| `web/src/components/StatusBar.tsx` | 新增 | 终端底部状态栏 |

### API 变更

| 方法 | 端点 | 说明 | 新增 |
|------|------|------|------|
| GET | `/api/templates` | 返回模板列表 | ✅ |
| GET | `/api/sessions/:id` | 获取单个会话详情 | ✅ 新增 |

---

## 三、模板数据模型

### 模板定义

```json
{
  "id": "claude-code",
  "name": "Claude Code",
  "description": "AI 编程助手终端",
  "command": "claude",
  "args": ["--dangerously-skip-permissions"],
  "cwd": "~/projects",
  "env": {
    "TERM": "xterm-256color"
  },
  "icon": "🤖",
  "platform": ["linux", "darwin"],
  "group": "AI Tools"
}
```

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | ✅ | 唯一标识，同时也是创建 session 时的默认 id |
| `name` | ✅ | UI 显示名称 |
| `description` | | 悬停/列表中的简短说明 |
| `command` | ✅ | 执行的命令 |
| `args` | | 启动参数 |
| `cwd` | | 默认工作目录 |
| `env` | | 环境变量 |
| `icon` | | Emoji 图标，UI 中显示 |
| `platform` | | 平台过滤（linux/darwin/win32），空则不限制 |
| `group` | | 分组标签，用于 UI 分组展示 |

### 默认模板列表

```json
[
  {
    "id": "bash",
    "name": "Bash Shell",
    "description": "标准 Bash 终端",
    "command": "bash",
    "cwd": "~",
    "icon": "🐚",
    "group": "Shells"
  },
  {
    "id": "cmd",
    "name": "Windows Command Prompt",
    "description": "Windows 命令提示符",
    "command": "cmd.exe",
    "cwd": "%USERPROFILE%",
    "icon": "🪟",
    "platform": ["win32"],
    "group": "Shells"
  },
  {
    "id": "powershell",
    "name": "PowerShell",
    "description": "PowerShell 7+",
    "command": "pwsh",
    "cwd": "~",
    "icon": "🔷",
    "platform": ["win32", "darwin", "linux"],
    "group": "Shells"
  },
  {
    "id": "claude-code",
    "name": "Claude Code",
    "description": "AI 编程助手",
    "command": "claude",
    "args": ["--dangerously-skip-permissions"],
    "cwd": "~",
    "env": { "TERM": "xterm-256color" },
    "icon": "🤖",
    "platform": ["linux", "darwin"],
    "group": "AI Tools"
  },
  {
    "id": "ssh-routeros",
    "name": "SSH RouterOS",
    "description": "连接到 MikroTik 路由器",
    "command": "ssh",
    "args": ["admin@192.168.88.1"],
    "cwd": "~",
    "icon": "🌐",
    "group": "Connections"
  },
  {
    "id": "ssh-server",
    "name": "SSH Remote Server",
    "description": "连接到远程 Linux 服务器",
    "command": "ssh",
    "args": ["user@server.example.com"],
    "cwd": "~",
    "icon": "🖥️",
    "group": "Connections"
  },
  {
    "id": "htop",
    "name": "System Monitor (htop)",
    "description": "实时系统监控",
    "command": "htop",
    "icon": "📊",
    "group": "Tools"
  }
]
```

### Session 创建时的继承规则

使用模板创建 session 时，用户可以在预览中覆盖以下字段：

```
模板 → { id, name, command, args, cwd, env }
                ↓
        用户覆盖（可选）
                ↓
 final SessionConfig
```

- 用户提供的字段优先级高于模板
- 未提供的字段继承模板默认值
- 模板中未定义的字段使用全局默认值

---

## 四、模块详细设计

### 4.1 服务端

#### templates.ts — 模板管理

```typescript
interface SessionTemplate {
  id: string;
  name: string;
  description?: string;
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  icon?: string;
  platform?: string[];
  group?: string;
}
```

职责：

- 加载 `templates.json`（不存在则用内置默认值创建）
- 按当前平台过滤（`templates.filter(t => !t.platform || t.platform.includes(process.platform))`）
- 提供 `GET /api/templates` 端点
- 提供 `applyTemplate(templateId, overrides)`：合并模板 + 用户覆盖

**平台过滤逻辑：**

```
调用 GET /api/templates
  → 读取 templates.json
  → 过滤：template.platform 为 undefined 或包含 process.platform
  → 返回过滤后的列表
```

#### config.json 新增字段

```json
{
  "templatesPath": "./templates.json"
}
```

**注意：** 除了修改 `config.json`，还需更新 `server/src/config.ts` 中的 `Config` 接口和默认值，新增 `templatesPath` 字段。

`templatesPath` 支持：
- 相对路径（相对于 `server/` 目录）
- 绝对路径
- 空值/null → 使用内置默认模板

### 4.2 前端

#### stores/templateStore.ts — 模板状态

```typescript
interface TemplateState {
  templates: SessionTemplate[];
  loading: boolean;
  fetchTemplates: () => Promise<void>;
}
```

#### components/TemplatePicker.tsx — 模板选择面板

UI 布局：

```
┌──────────────────────────────┐
│  Shells                      │
│  🐚 Bash Shell               │
│  🪟 Windows Command Prompt   │
│  🔷 PowerShell               │
│                              │
│  AI Tools                    │
│  🤖 Claude Code              │
│                              │
│  Connections                 │
│  🌐 SSH RouterOS             │
│  🖥️ SSH Remote Server        │
│                              │
│  ─── OR ───                  │
│  ✏️ Custom (manual input)    │
└──────────────────────────────┘
```

交互行为：

| 操作 | 行为 |
|------|------|
| 点击模板卡片 | 直接创建 session 并打开标签（跳过表单） |
| 点击 ✏️ Custom | 打开当前的手动填写表单 |
| 悬停模板 | 显示 `description` tooltip |
| 分组标题 | 纯展示，不可点击 |

#### components/StatusBar.tsx — 终端状态栏

状态栏位于终端底部，显示：

```
Session: my-shell  |  PID: 12345  |  CWD: ~/projects  |  uptime: 00:15:32
```

数据来源：
- `pid`、初始 `cwd`：来自 `SessionMeta`（已有字段，无需新增接口）
- `uptime`：前端本地计时（`Date.now() - createdAt`）

实现：

- 由 `TerminalView.tsx` 在 xterm 容器下方渲染
- 深色背景、小号字体，不遮挡终端内容
- 不扩展 WebSocket 协议
- `uptime` 计算公式：`Date.now() - new Date(session.createdAt).getTime()`，每秒 tick 更新
- 使用 `setInterval(1000)` 驱动计时更新，组件卸载时 clear

#### Sidebar.tsx 变更

新建弹窗改为两阶段：

```
第一阶段：模板选择（TemplatePicker）
  → 点击模板 → 直接创建
  → 点击 "Custom" → 进入第二阶段

第二阶段：手动填写表单（现有表单）
```

---

## 五、API 规格

### 新增端点

```
GET /api/templates
  → 200 SessionTemplate[]
  → 说明：返回按当前平台过滤后的模板列表

GET /api/sessions/:id
  → 200 SessionMeta
  → 404 { error: "Session not found" }
```

### WebSocket 扩展

无变更，StatusBar 数据由前端从 SessionMeta 计算，不扩展 WebSocket 协议。

---

## 六、数据流

### 使用模板创建会话（一键流程）

```
User                React                    Fastify               SQLite / FS
 │                    │                        │                       │
 ├─ 点击 "+ New" ───▶│                        │                       │
 │                    ├─ GET /api/templates ──▶│                       │
 │                    │                        ├─ read templates.json ─▶│
 │                    │                        ├─ filter by platform   │
 │                    │◀─ template[] ──────────│                       │
 │◀─ 看到模板列表 ────│                        │                       │
 │                    │                        │                       │
 │ 点击 "Claude Code" │                        │                       │
 │                    ├─ POST /api/sessions ──▶│                       │
 │                    │    { id: "claude-code", │                       │
 │                    │      command: "claude", │                       │
 │                    │      ...from template } │                       │
 │                    │                        ├─ INSERT SQLite ──────▶│
 │                    │                        ├─ spawn PTY            │
 │                    │◀─ 201 SessionMeta ─────│                       │
 │                    │                        │                       │
 │ 打开标签 + WS 连接 │                        │                       │
 │◀─ 终端已就绪 ──────│                        │                       │
```

---

## 七、边界情况与异常处理

| 场景 | 预期行为 | 实现位置 |
|------|---------|---------|
| templates.json 不存在 | 使用内置默认模板，首次启动自动创建 | templates.ts |
| templates.json 格式错误 | 回退到内置默认模板，日志 warning | templates.ts |
| 模板 id 冲突（同名模板覆盖） | 后加载的覆盖前一个，不报错 | templates.ts |
| 模板中 command 不存在（如 claude 未安装） | session 创建成功但 PTY 启动失败，status 为 error | session-manager.ts（已有逻辑） |
| 平台过滤后模板为空 | 返回空数组，UI 显示 "可用模板为空，请手动创建" | TemplatePicker.tsx |
| 模板名称为空 | 跳过该模板，日志 warning | templates.ts |
| 频繁点击模板 | 串行处理，防止创建多个同名 session | 前端按钮 disabled 状态 |
| session id 与模板 id 冲突（已存在同名 session） | 前端检查 session 列表，弹出重命名提示，不自动加后缀 | TemplatePicker.tsx |

---

## 八、运行说明

### 配置文件

新增模板配置文件 `server/templates.json`，优先级：

1. `config.json` 中 `templatesPath` 指定的路径
2. 默认值：`server/templates.json`
3. 若以上都不存在 → 使用代码内置的硬编码默认模板

### 用户自定义模板

用户可通过编辑 `templates.json` 添加自定义模板，格式：

```json
[
  {
    "id": "my-custom",
    "name": "My Custom Shell",
    "command": "docker",
    "args": ["exec", "-it", "my-container", "bash"],
    "cwd": "/workspace",
    "group": "Docker"
  }
]
```

编辑后重启服务即可生效（`npm run dev:server` 自动 watch 重启）。

---

## 九、第二阶段交付清单

| # | 交付物 | 状态 |
|---|--------|------|
| 1 | 第二阶段开发计划（本文档） | ✅ |
| 2 | `server/src/templates.ts` — 模板加载 + 平台过滤 + API 路由 | ⬜ |
| 3 | `server/templates.json` — 默认模板定义 | ⬜ |
| 4 | `web/src/stores/templateStore.ts` — 模板列表状态（含 fetchTemplates） | ⬜ |
| 5 | `web/src/components/TemplatePicker.tsx` — 模板选择面板 | ⬜ |
| 6 | `web/src/components/StatusBar.tsx` — 终端状态栏 | ⬜ |
| 7 | Sidebar.tsx 改造 — 集成模板选择器 | ⬜ |
| 8 | config.json 新增 templatesPath 字段 | ⬜ |

**功能验证清单：**

- [ ] `GET /api/templates` 返回平台过滤后的模板列表
- [ ] templates.json 不存在时自动创建默认模板
- [ ] templates.json 格式错误时回退内置模板
- [ ] 点击模板一键创建 session（无表单）
- [ ] 平台过滤正确（Windows 上不显示 claude 模板）
- [ ] 模板分组展示（Shells / AI Tools / Connections）
- [ ] Custom 入口进入手动填写表单
- [ ] 终端底部显示状态栏（PID / CWD / uptime）
- [ ] 编辑 templates.json + 重启后新模板生效

---

## 十、不纳入第二阶段

| 功能 | 原因 | 计划 |
|------|------|------|
| 模板热加载（不重启） | 需要 `fs.watch` 监听文件变更，增加复杂性 | 后续优化 |
| 前端管理模板（增删改 UI） | 模板是配置文件驱动的，暂不做管理界面 | 后续优化 |
| 模板变量替换（如 `{{hostname}}`） | 增加解析复杂度，当前阶段不需要 | 后续优化 |
| 权限管理 | 独立的安全阶段 | 阶段三 |
| 会话搜索 | 独立的高级能力阶段 | 阶段四 |
