# Termai 项目开发计划 — 第三阶段：系统设置

> 文档状态：规划中
> 对应版本：v0.1.3
> 前置条件：第二阶段已完成（会话模板、一键创建、状态栏）

---

## 一、阶段目标

在侧栏底部添加**系统设置面板**，整合语言切换和主题切换，所有偏好持久化到 `localStorage`。

### 核心验证点

| # | 验证点 | 验收标准 |
|---|--------|---------|
| 1 | 设置入口 | 侧栏底部有齿轮图标，点击打开设置面板 |
| 2 | 语言切换 | 中文/English 切换后 UI 标签即时更新 |
| 3 | 主题切换 | 深色/浅色模式切换后 UI 即时更新 |
| 4 | xterm 主题联动 | 切换主题时终端配色同步切换 |
| 5 | 偏好持久化 | 刷新页面后语言和主题选择保持不变 |
| 6 | 跟随系统 | 主题可选择跟随系统 `prefers-color-scheme` |

---

## 二、整体架构变化

```
Phase 2 架构：
  Sidebar → 会话列表 | "+ New" → 模板弹窗

Phase 3 架构：
  Sidebar → 会话列表 | "+ New" → 模板弹窗
            底部：⚙️ 设置按钮 → 设置面板弹窗
                                  ├── 语言选择器
                                  └── 主题选择器
```

### 新增/修改模块

| 模块 | 新增/修改 | 说明 |
|------|----------|------|
| `web/src/stores/settingsStore.ts` | 新增 | 语言 + 主题 + 字体大小状态管理，localStorage 持久化 |
| `web/src/i18n/messages.ts` | 新增 | 翻译字典（zh-CN / en），含字体设置条目 |
| `web/src/components/SettingsPanel.tsx` | 新增 | 设置面板（语言 + 主题 + 字体大小选择器） |
| `web/src/components/Sidebar.tsx` | 修改 | 底部增加设置按钮 |
| `web/src/App.tsx` | 修改 | 读取 settingsStore 应用主题 class |
| `web/src/components/Terminal.tsx` | 修改 | 根据主题切换 xterm.js theme 配置 |
| `web/src/index.css` | 修改 | 添加浅色模式样式覆盖 |

---

## 三、数据模型

### 设置状态

```typescript
type Language = "zh-CN" | "en";
type Theme = "dark" | "light" | "system";

interface SettingsState {
  language: Language;
  theme: Theme;
  fontSize: number;
  setLanguage: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
  setFontSize: (size: number) => void;
}
```

所有设置持久化到 `localStorage`：

| key | 类型 | 默认值 | 说明 |
|-----|------|--------|------|
| `termai-language` | `zh-CN \| en` | `zh-CN` | 语言偏好 |
| `termai-theme` | `dark \| light \| system` | `dark` | 主题偏好，默认深色 |
| `termai-font-size` | `number` | `13` | 终端字体大小（px），范围 10-24 |

---

## 四、模块详细设计

### 4.1 设置状态管理

#### stores/settingsStore.ts

```typescript
function getInitialLanguage(): Language {
  return (localStorage.getItem("termai-language") as Language) ?? "zh-CN";
}

function getInitialTheme(): Theme {
  return (localStorage.getItem("termai-theme") as Theme) ?? "system";
}
```

应用主题逻辑：

```typescript
function applyTheme(theme: Theme) {
  const isDark = theme === "system"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : theme === "dark";

  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.classList.toggle("light", !isDark);
}
```

- 初始化时从 localStorage 读取
- 切换时写入 localStorage + 即时应用
- 监听 `prefers-color-scheme` change 事件（system 模式时）

**fontSize 实现：**

```typescript
function getInitialFontSize(): number {
  const stored = localStorage.getItem("termai-font-size");
  if (stored) {
    const n = parseInt(stored, 10);
    if (!isNaN(n) && n >= 10 && n <= 24) return n;
  }
  return 13;
}

export const settingsStore = create<SettingsState>((set) => ({
  ...
  fontSize: getInitialFontSize(),
  setFontSize: (fontSize) => {
    localStorage.setItem("termai-font-size", String(fontSize));
    set({ fontSize });
  },
}));
```

#### i18n 实现方案

采用**简单对象映射**，不引入 i18n 框架（避免增加 bundle 体积）：

```typescript
const messages: Record<Language, Record<string, string>> = {
  "zh-CN": {
    "app.name": "Termai",
    "sidebar.new": "+ 新建",
    "sidebar.no_sessions": "暂无会话，点击上方新建",
    "tabs.empty": "从侧栏选择一个会话",
    "terminal.connecting": "连接中...",
    "terminal.connected": "已连接",
    "terminal.disconnected": "已断开",
    "settings.title": "系统设置",
    "settings.language": "语言",
    "settings.theme": "主题",
    "settings.dark": "深色模式",
    "settings.light": "浅色模式",
    "settings.system": "跟随系统",
    "modal.create": "新建会话",
    "modal.custom": "自定义",
    // ...
  },
  "en": {
    "app.name": "Termai",
    "sidebar.new": "+ New",
    "sidebar.no_sessions": "No sessions. Create one to get started.",
    "tabs.empty": "Select a session from the sidebar",
    "terminal.connecting": "Connecting...",
    "terminal.connected": "Connected",
    "terminal.disconnected": "Disconnected",
    "settings.title": "System Settings",
    "settings.language": "Language",
    "settings.theme": "Theme",
    "settings.dark": "Dark Mode",
    "settings.light": "Light Mode",
    "settings.system": "Follow System",
    "modal.create": "New Session",
    "modal.custom": "Custom",
    // ...
  },
};
```

使用方式：

```typescript
// settingsStore.ts 中暴露 useT hook
export function useT() {
  const language = useSettingsStore((s) => s.language);
  return (key: string) => messages[language][key] ?? key;
}

// 组件中使用
const t = useT();
```

`useT()` 定义在 store 文件中，各组件直接导入，避免在每个组件内重复定义 `t` 函数。

翻译涵盖范围：

- 侧栏：标题、按钮、空状态提示、设置入口
- 标签栏：空状态提示
- 终端：状态文字（connecting/connected/disconnected）
- 模板选择面板：标题、分组名、Custom 按钮
- 设置面板：标题、选项标签
- 手动创建表单：标签、按钮
- 状态栏：PID / CWD / uptime 标签
- 模板分组名：Shells / AI Tools / Connections / Tools

### 4.2 主题实现

#### 深色模式配色方案

采用**高对比度深色风格**，取代原有的 Tokyo Night 配色：

| Token | Tokyo Night（旧） | 深色模式（新） | 用途 |
|-------|------------------|-----------------|------|
| 背景 | `#1a1b26` 蓝紫黑 | `#000000` 纯黑 | 页面背景（OLED 友好） |
| 面板 | `#1f2937` 蓝灰 | `#1c1c1e` | 侧栏、卡片、弹窗 |
| 面板二级 | `#374151` | `#2c2c2e` | 按钮、标签栏 |
| 悬停 | `#4b5563` | `#3a3a3c` | 按钮/列表 hover |
| 主文字 | `#a9b1d6` 紫灰 | `#f5f5f7` 白 | 标题、正文 |
| 次要文字 | `#9ca3af` | `#98989d` | 辅助文本、状态栏 |
| 蓝色高亮 | `#3b82f6` / `#7aa2f7` | `#007aff` | 按钮、选中态、链接 |
| 分割线 | `#374151` | `#38383a` | 边框、分割线 |

选择理由：终端管理工具需要长时间使用，高对比度（纯黑底 + 纯白字）比 Tokyo Night 的蓝紫灰更护眼、更清晰。

#### Tailwind 4 颜色变量映射

```css
/* 深色主题色板 */
:root {
  --color-gray-900: #000000;    /* 背景 - 纯黑 */
  --color-gray-800: #1c1c1e;    /* 面板 */
  --color-gray-700: #2c2c2e;    /* 面板二级 */
  --color-gray-600: #3a3a3c;    /* 悬停 */
  --color-gray-500: #98989d;    /* 次要文字 */
  --color-gray-400: #98989d;    /* 次要文字 / 图标 */
  --color-gray-300: #aeaeb2;    /* 不可用文字 */
  --color-gray-200: #c7c7cc;    /* 禁用态 */
  --color-gray-100: #f5f5f7;    /* 主文字 - 纯白 */
  --color-gray-50:  #ffffff;    /* 最亮 */
  --color-blue-600: #007aff;    /* 蓝色高亮 */
}
```

#### 浅色模式色板

```css
.light {
  --color-gray-900: #ffffff;      /* 纯白背景 */
  --color-gray-800: #f2f2f7;     /* 面板 */
  --color-gray-700: #e5e5ea;     /* 面板二级 */
  --color-gray-600: #d1d1d6;     /* 悬停 */
  --color-gray-500: #8e8e93;     /* 次要文字 */
  --color-gray-400: #aeaeb2;     /* 图标 */
  --color-gray-300: #c7c7cc;     /* 禁用态 */
  --color-gray-100: #1c1c1e;     /* 主文字 */
  --color-gray-50:  #000000;     /* 最深 */
}
```

#### xterm.js 主题联动

Terminal.tsx 监听 settingsStore 的 theme 字段，重建 xterm 实例时切换 theme：

```typescript
// 深色主题：高对比度风格
const DARK_THEME = {
  background: "#1c1c1e", foreground: "#f5f5f7", cursor: "#ffffff",
  selectionBackground: "#007aff",
  black: "#1c1c1e", red: "#ff453a", green: "#32d74b",
  yellow: "#ffd60a", blue: "#007aff", magenta: "#bf5af2",
  cyan: "#64d2ff", white: "#f5f5f7",
  brightBlack: "#3a3a3c", brightRed: "#ff453a", brightGreen: "#30d158",
  brightYellow: "#ffd60a", brightBlue: "#0a84ff", brightMagenta: "#bf5af2",
  brightCyan: "#64d2ff", brightWhite: "#ffffff",
};

// 浅色主题：高对比度风格
const LIGHT_THEME = {
  background: "#ffffff", foreground: "#1c1c1e", cursor: "#007aff",
  selectionBackground: "#bfdaff",
  black: "#1c1c1e", red: "#ff3b30", green: "#34c759",
  yellow: "#ff9500", blue: "#007aff", magenta: "#af52de",
  cyan: "#34aadc", white: "#f5f5f7",
  brightBlack: "#8e8e93", brightRed: "#ff3b30", brightGreen: "#28cd41",
  brightYellow: "#ff9500", brightBlue: "#007aff", brightMagenta: "#af52de",
  brightCyan: "#34aadc", brightWhite: "#ffffff",
};
```

当主题切换时，直接赋值即可（无需重建 xterm 实例）：

```typescript
term.options.theme = newTheme;
```

#### 终端字体大小设置

Terminal.tsx 监听 settingsStore 的 `fontSize` 字段，通过 `term.options.fontSize` 即时调整：

```typescript
// 在 xterm 初始化时读取 fontSize
const fontSize = settingsStore.getState().fontSize;
const term = new XTerm({ ..., fontSize });

// 字体大小变化时，无需重建 xterm 实例
useEffect(() => {
  const term = xtermRef.current;
  if (!term) return;
  term.options.fontSize = fontSize;
  // 触发 fitAddon.fit() 以重新计算终端尺寸
  fitAddonRef.current?.fit();
}, [fontSize]);
```

Terminal.tsx 变更：在组件内订阅 `settingsStore((s) => s.fontSize)`，值变化时更新 xterm 实例的 `fontSize` 选项。

### 4.3 UI 组件

#### SettingsPanel.tsx

依赖新增：`@heroicons/react`（Heroicons 官方 React 组件库）

```
npm install @heroicons/react
```

布局：

```
┌──────────────────────────┐
│ ⚙️ System Settings        │
│                          │
│ Language                 │
│ [中文] [English]         │
│                          │
│ Theme                    │
│ [🌙 Dark] [☀️ Light]      │
│ [🖥️  Follow System]      │
└──────────────────────────┘
```

图标对应表（emoji → Heroicons）：

| 位置 | Emoji | Heroicons 组件 |
|------|-------|----------------|
| 侧栏设置按钮 | ⚙️ | `Cog6ToothIcon` |
| 设置面板标题 | ⚙️ | `Cog6ToothIcon` |
| 深色模式 | 🌙 | `MoonIcon` |
| 浅色模式 | ☀️ | `SunIcon` |
| 跟随系统 | 🖥️ | `ComputerDesktopIcon` |
| Custom 按钮 | ✏️ | `PencilIcon` |

使用方式：

```tsx
import { Cog6ToothIcon, MoonIcon, SunIcon, ComputerDesktopIcon } from "@heroicons/react/24/outline";
```

设置按钮 24x24 outline 风格，与深色/浅色主题联动。

#### 设置面板布局（完整版）

```
┌──────────────────────────┐
│ ⚙️ System Settings        │
│                          │
│ Language                 │
│ [中文] [English]         │
│                          │
│ Theme                    │
│ [🌙 Dark]                │
│ [☀️ Light]               │
│ [🖥️  Follow System]      │
│                          │
│ Font Size                │
│ [−]  13px  [+]           │
│   ──●───────  slider     │
└──────────────────────────┘
```

字体大小控制：

- 加减按钮：点击 ± 每次增减 1px
- Slider：范围 10-24px
- 默认值 13px
- 变更即时生效，无需刷新

#### Sidebar.tsx 变更

底部新增固定区域：

```
┌──────────────────────┐
│  会话列表...          │
│                      │
│──────────────────────│
│ ⚙️            v0.1.3 │  ← 新增：底部设置栏
└──────────────────────┘
```

---

## 五、翻译对照表

### 侧栏

| key | zh-CN | en |
|-----|-------|----|
| sidebar.new | + 新建 | + New |
| sidebar.no_sessions | 暂无会话，点击上方新建 | No sessions. Create one to get started. |
| sidebar.delete_title | 删除 | Delete |

### 标签栏

| key | zh-CN | en |
|-----|-------|----|
| tabs.empty | 从侧栏选择一个会话 | Select a session from the sidebar |

### 终端

| key | zh-CN | en |
|-----|-------|----|
| terminal.connecting | 连接中... | Connecting... |
| terminal.connected | 已连接 | Connected |
| terminal.disconnected | 已断开 | Disconnected |
| terminal.error_prefix | 错误 | Error |

### 设置

| key | zh-CN | en |
|-----|-------|----|
| settings.title | 系统设置 | System Settings |
| settings.language | 语言 | Language |
| settings.theme | 主题 | Theme |
| settings.dark | 深色模式 | Dark Mode |
| settings.light | 浅色模式 | Light Mode |
| settings.system | 跟随系统 | Follow System |

### 模板

| key | zh-CN | en |
|-----|-------|----|
| modal.create | 新建会话 | New Session |
| modal.custom | 自定义 | Custom |
| modal.back | ← 模板列表 | ← Templates |
| modal.cancel | 取消 | Cancel |
| modal.create_btn | 创建 | Create |

### 模板分组

| key | zh-CN | en |
|-----|-------|----|
| group.Shells | Shells | Shells |
| group.AI Tools | AI 工具 | AI Tools |
| group.Connections | 连接 | Connections |
| group.Tools | 工具 | Tools |

### 状态栏

| key | zh-CN | en |
|-----|-------|----|
| statusbar.pid | PID | PID |
| statusbar.cwd | CWD | CWD |
| statusbar.uptime | 运行时间 | uptime |

### 字体设置

| key | zh-CN | en |
|-----|-------|----|
| settings.font_size | 字体大小 | Font Size |
| settings.font_reset | 重置 | Reset |

---

## 六、边界情况与异常处理

| 场景 | 预期行为 | 实现位置 |
|------|---------|---------|
| localStorage 不可用 | 使用默认值（zh-CN, system），静默降级 | settingsStore.ts |
| localStorage 值为空/非法 | 忽略非法值，使用默认值 | settingsStore.ts |
| 系统主题变更（system 模式） | 监听 matchMedia change 事件，自动切换 | settingsStore.ts |
| xterm 实例未初始化时切换主题 | 将 theme 存入变量，初始化时读取 | Terminal.tsx |
| 语言切换时组件未挂载 | 通过 Zustand selector 订阅，自动重渲染 | 各组件 |

---

## 七、运行说明

无新增依赖，所有功能纯前端实现。设置存储在 `localStorage`，无需后端变更。

---

## 八、第三阶段交付清单

| # | 交付物 | 状态 |
|---|--------|------|
| 1 | 第三阶段开发计划（本文档） | ✅ |
| 2 | `web/src/stores/settingsStore.ts` — 设置状态管理 | ✅ |
| 3 | `web/src/i18n/messages.ts` — 翻译字典 | ✅ |
| 4 | `web/src/components/SettingsPanel.tsx` — 设置面板 | ✅ |
| 5 | Sidebar.tsx 改造 — 底部设置入口 | ✅ |
| 6 | App.tsx 改造 — 应用主题 class | ✅ |
| 7 | Terminal.tsx 改造 — 主题联动 | ✅ |
| 8 | index.css + 各组件 — 浅色模式样式 | ✅ |

**功能验证清单：**

- [ ] 侧栏底部显示设置按钮 ⚙️
- [ ] 点击设置按钮打开设置面板
- [ ] 切换语言后所有 UI 标签即时更新
- [ ] 刷新页面后语言选择保持
- [ ] 切换深色/浅色模式即时生效
- [ ] 浅色模式下终端配色正确切换
- [ ] 跟随系统模式随 OS 主题自动切换
- [ ] 刷新页面后主题选择保持
- [ ] 点击面板外部关闭设置面板
- [ ] 字体大小加减按钮调整终端字号
- [ ] 字体大小 slider 联动即时生效
- [ ] 刷新页面后字体大小保持

---

## 九、不纳入第三阶段

| 功能 | 原因 | 计划 |
|------|------|------|
| 日文/韩文等多语言 | 当前只支持中文和英文，后续按需扩展 | 后续优化 |
| 字体设置 | 系统设置扩展功能 | 后续优化 |
| 终端字号设置 | 本次已纳入设置面板 | v0.1.3 |
| 服务端 i18n（错误消息翻译） | 前端优先，服务端后续补充 | 安全阶段后 |
| 其他系统设置（如 scrollback 行数） | 暂不纳入 | 后续优化 |
