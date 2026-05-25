# Termai 项目开发计划 — 第四阶段：移动端客户端

> 文档状态：规划中
> 对应版本：v0.1.5
> 前置条件：第三阶段已完成（系统设置、i18n、主题切换、字体大小）

---

## 一、阶段目标

将 Termai 从桌面端 Web 终端扩展为**支持手机和平板访问的移动端应用**，核心是触屏交互优化和响应式 UI 适配。

### 核心验证点

| # | 验证点 | 验收标准 |
|---|--------|---------|
| 1 | PWA 可安装 | 手机浏览器访问时弹出安装提示，安装后全屏运行 |
| 2 | 侧栏响应式 | 手机模式下侧栏默认隐藏，点击汉堡菜单展开/收起 |
| 3 | 终端触屏输入 | 点击终端区域弹出虚拟键盘，输入正常 |
| 4 | 终端缩放 | 双指缩放终端字体大小，不影响设置 |
| 5 | 标签栏适配 | 标签过多时可横向滚动，触控滑动切换 |
| 6 | 键盘不遮挡 | 虚拟键盘弹出时终端区域自动调整到可视区域 |
| 7 | 离线访问 | Service Worker 缓存基本 UI，断网时显示友好提示 |

---

## 二、整体架构变化

```
Phase 3 架构（桌面 only）：
  Sidebar | Tabs | Terminal — 固定三栏布局

Phase 4 架构（桌面 + 移动端）：
  桌面端：不变
  移动端：汉堡菜单 → 侧栏抽屉 | Terminal 全屏 | 底部导航
```

### 新增/修改模块

| 模块 | 新增/修改 | 说明 |
|------|----------|------|
| `web/public/manifest.json` | 新增 | PWA manifest（名称、图标、主题色） |
| `web/public/icons/` | 新增 | PWA 图标（192x192, 512x512） |
| `web/src/hooks/useResponsive.ts` | 新增 | 屏幕尺寸检测 + 断点逻辑 |
| `web/src/hooks/useSwipe.ts` | 新增 | 触控滑动检测（切换标签） |
| `web/src/components/MobileNav.tsx` | 新增 | 移动端底部导航栏 |
| `web/src/components/Sidebar.tsx` | 修改 | 移动端改为抽屉式 |
| `web/index.html` | 修改 | 添加 PWA meta 标签（`<meta name="theme-color">` + `<link rel="manifest">`） |
| `web/vite.config.ts` | 修改 | 集成 vite-plugin-pwa，SW 自动生成到 dist/sw.js |

---

## 三、响应式断点

| 断点 | 宽度 | 布局 |
|------|------|------|
| `sm` | < 640px | 手机：抽屉侧栏 + 全屏终端 + 底部导航 |
| `md` | 640-1024px | 平板：可折叠侧栏 + 终端 |
| `lg` | > 1024px | 桌面（当前布局不变） |

### 响应式行为矩阵

| 组件 | 桌面 (lg) | 平板 (md) | 手机 (sm) |
|------|----------|----------|----------|
| Sidebar | 固定 240px | 可折叠抽屉 | 抽屉 + 汉堡按钮 |
| Tabs | 标签栏 | 标签栏 | 横向滚动标签 |
| Terminal | 正常 | 全宽 | 全屏 |
| StatusBar | 显示 | 精简 | 隐藏 |
| Settings 按钮 | 侧栏底部 | 侧栏底部 | 底部导航 |
| +New 按钮 | 侧栏顶部 | 侧栏顶部 | 底部导航 |

---

## 四、模块详细设计

### 4.1 PWA 支持

#### manifest.json

```json
{
  "name": "Termai",
  "short_name": "Termai",
  "description": "Web Terminal Manager",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

#### index.html PWA 标签

```html
<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
<link rel="manifest" href="/manifest.json" />
```

使用 `vite-plugin-pwa` 自动生成 Service Worker：

```bash
npm install vite-plugin-pwa
```

```typescript
// vite.config.ts
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*.png"],
      manifest: {
        name: "Termai",
        short_name: "Termai",
        display: "standalone",
        theme_color: "#000000",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
});
```

### 4.2 响应式 Hook

#### useResponsive.ts

```typescript
type Breakpoint = "sm" | "md" | "lg";

interface ResponsiveState {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}
```

实现逻辑：

- 监听 `window.innerWidth` 变化（使用 ResizeObserver 或 `matchMedia`）
- `< 640px` → `sm`（手机）
- `640-1024px` → `md`（平板）
- `> 1024px` → `lg`（桌面）
- 手机/平板模式下侧栏默认关闭，通过汉堡按钮切换
- 桌面模式下侧栏始终显示

#### useSwipe.ts

```typescript
interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}
```

实现逻辑：

- 监听 `touchstart` / `touchmove` / `touchend` 事件
- 计算滑动距离和方向
- 阈值：水平滑动 > 50px 触发，垂直滑动忽略
- 左滑：切换到下一个标签
- 右滑：切换到上一个标签

### 4.3 UI 组件

#### MobileNav.tsx

移动端底部导航栏，固定高度 56px：

```
┌────────────────────────────────────┐
│  ☰                    🔷  [+]  ⚙️ │
│  Sessions    Terminal    New   Set │
└────────────────────────────────────┘
```

| 按钮 | 图标 | 行为 |
|------|------|------|
| ☰ Sessions | `Bars3Icon` | 打开侧栏抽屉 |
| 🔷 Terminal | `TerminalIcon` | 回到终端（已有标签时） |
| [+] New | `PlusIcon` | 打开新建会话弹窗 |
| ⚙️ Settings | `Cog6ToothIcon` | 打开设置面板 |

#### Sidebar 抽屉模式

手机/平板下侧栏改为从左侧滑入的抽屉：

```
┌───────┬────────────────────────────┐
│       │                            │
│ Sidebar (overlay)                 │
│ 宽度 280px                        │  ← 半透明遮罩
│       │                            │
│       │                            │
└───────┴────────────────────────────┘
```

- 侧栏从左侧滑入，占屏幕 80%（最大 280px）
- 右侧为半透明遮罩，点击遮罩关闭侧栏
- 切换动画：CSS transform translateX
- 桌面模式下保持固定侧栏（不变）

#### 终端触屏适配

虚拟键盘弹出处理：

```typescript
// 使用 VisualViewport API 监听键盘弹出
if ("visualViewport" in window) {
  window.visualViewport.addEventListener("resize", () => {
    const viewport = window.visualViewport;
    const diff = window.innerHeight - viewport.height;
    if (diff > 100) {
      // 键盘弹出，调整终端可见区域
      setKeyboardOffset(diff);
    } else {
      // 键盘收起
      setKeyboardOffset(0);
    }
  });
}
```

- 键盘弹出时将终端滚动到可视区域
- 输入框始终保持在键盘上方
- 终端历史 scrollback 区域自动滚动到底部

### 4.4 CSS 响应式

在 `index.css` 中添加移动端样式：

```css
/* 手机端侧栏抽屉动画 */
.sidebar-drawer {
  transform: translateX(-100%);
  transition: transform 0.2s ease;
}
.sidebar-drawer.open {
  transform: translateX(0);
}

/* 移动端底部导航 */
.mobile-nav {
  display: none;
}
@media (max-width: 640px) {
  .mobile-nav { display: flex; }
  .sidebar-desktop { display: none; }
}
```

---

## 五、翻译对照表

| key | zh-CN | en |
|-----|-------|----|
| mobile.sessions | 会话 | Sessions |
| mobile.terminal | 终端 | Terminal |
| mobile.new | 新建 | New |
| mobile.settings | 设置 | Settings |
| mobile.offline | 网络已断开，正在重连... | Offline, reconnecting... |

---

## 六、边界情况与异常处理

| 场景 | 预期行为 | 实现位置 |
|------|---------|---------|
| 手机横屏 | 自动切换为横屏布局，侧栏可固定 | useResponsive.ts |
| iOS Safari | 兼容 iOS 键盘行为，使用 visualViewport API | Terminal 触屏适配 |
| Android Chrome | PWA 安装提示，全屏显示 | manifest.json |
| 离线访问 | 显示离线提示，Service Worker 返回缓存页面 | sw.js |
| 触屏误触 | 点击终端区域延迟触发键盘，防止误弹出 | Terminal.tsx |
| 多指手势 | 双指操作缩放终端，单指操作输入 | Terminal.tsx |
| 屏幕旋转 | 布局即时适配，终端重新计算尺寸 | useResponsive.ts + fitAddon.fit() |

---

## 七、新增依赖

| 包名 | 用途 |
|------|------|
| `vite-plugin-pwa` | PWA + Service Worker 自动生成 |

安装：

```bash
cd web && npm install -D vite-plugin-pwa
```

无需其他新增依赖。`@heroicons/react` 已在第三阶段安装，Heroicons 图标可直接使用。

---

## 八、第四阶段交付清单

| # | 交付物 | 状态 |
|---|--------|------|
| 1 | 第四阶段开发计划（本文档） | ✅ |
| 2 | `web/public/manifest.json` + icons | ✅ |
| 3 | `vite-plugin-pwa` 集成 | ✅ |
| 4 | `web/src/hooks/useResponsive.ts` — 响应式断点 | ✅ |
| 5 | `web/src/hooks/useSwipe.ts` — 触控滑动 | ✅ |
| 6 | `web/src/components/MobileNav.tsx` — 底部导航 | ✅ |
| 7 | Sidebar.tsx 改造 — 抽屉模式 | ✅ |
| 8 | Terminal 触屏适配 — 键盘处理 + 缩放 | ✅ |
| 9 | App.tsx 改造 — 响应式布局切换 | ✅ |
| 10 | index.css — 移动端样式 | ✅ |

**功能验证清单：**

- [x] 手机浏览器访问显示安装 PWA 提示
- [x] 安装后全屏启动，无浏览器 chrome
- [x] 手机模式下侧栏隐藏，汉堡按钮可打开抽屉
- [x] 点击抽屉外遮罩关闭侧栏
- [x] 桌面端布局完全不变
- [x] 平板端侧栏可折叠
- [x] 点击终端弹出虚拟键盘，输入正常
- [x] 虚拟键盘不遮挡终端输入
- [ ] 底部导航栏 4 个按钮功能正常
- [ ] 双指缩放终端字体
- [ ] 滑动切换标签
- [ ] 断网时显示友好提示

---

## 九、不纳入第四阶段

| 功能 | 原因 | 计划 |
|------|------|------|
| iOS/Android 原生 App | 当前 PWA 方案成本最低，覆盖大部分需求 | 后续评估 |
| 推送通知 | PWA 推送需要服务端配合 | 后续优化 |
| 触屏专用输入键盘（如 Ctrl 键面板） | 增加复杂度，阶段性跳过 | 后续优化 |
| 离线编辑会话模板 | PWA 缓存策略不覆盖动态数据 | 后续优化 |
