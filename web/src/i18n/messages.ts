export type Language = "zh-CN" | "en";

export type MessageDict = Record<string, string>;

const zhCN: MessageDict = {
  "app.name": "Termai",
  // Sidebar
  "sidebar.new": "+ 新建",
  "sidebar.no_sessions": "暂无会话，点击上方新建",
  "sidebar.delete": "删除",
  "sidebar.settings": "设置",
  // Tabs
  "tabs.empty": "从侧栏选择一个会话",
  // Terminal
  "terminal.connecting": "连接中...",
  "terminal.connected": "已连接",
  "terminal.disconnected": "已断开",
  "terminal.error": "错误",
  // Settings
  "settings.title": "系统设置",
  "settings.language": "语言",
  "settings.theme": "主题",
  "settings.dark": "深色模式",
  "settings.light": "浅色模式",
  "settings.system": "跟随系统",
  "settings.font_size": "字体大小",
  "settings.font_reset": "重置",
  // Modal - Create
  "modal.create": "新建会话",
  "modal.custom": "自定义",
  "modal.back": "← 模板列表",
  "modal.cancel": "取消",
  "modal.create_btn": "创建",
  "modal.placeholder_id": "会话标识（如 my-shell）",
  "modal.placeholder_name": "显示名称",
  "modal.placeholder_cmd": "命令（如 cmd.exe、powershell、bash）",
  "modal.placeholder_cwd": "工作目录（可选）",
  // Modal - Template groups
  "group.Shells": "Shells",
  "group.AI Tools": "AI 工具",
  "group.Connections": "连接",
  "group.Tools": "工具",
  // StatusBar
  "statusbar.pid": "PID",
  "statusbar.cwd": "CWD",
  "statusbar.uptime": "运行时间",
};

const en: MessageDict = {
  "app.name": "Termai",
  "sidebar.new": "+ New",
  "sidebar.no_sessions": "No sessions. Create one to get started.",
  "sidebar.delete": "Delete",
  "sidebar.settings": "Settings",
  "tabs.empty": "Select a session from the sidebar",
  "terminal.connecting": "Connecting...",
  "terminal.connected": "Connected",
  "terminal.disconnected": "Disconnected",
  "terminal.error": "Error",
  "settings.title": "System Settings",
  "settings.language": "Language",
  "settings.theme": "Theme",
  "settings.dark": "Dark Mode",
  "settings.light": "Light Mode",
  "settings.system": "Follow System",
  "settings.font_size": "Font Size",
  "settings.font_reset": "Reset",
  "modal.custom": "Custom",
  "modal.back": "← Templates",
  "modal.cancel": "Cancel",
  "modal.create_btn": "Create",
  "modal.placeholder_id": "Session ID (e.g. my-shell)",
  "modal.placeholder_name": "Display Name",
  "modal.placeholder_cmd": "Command (e.g. cmd.exe, powershell, bash)",
  "modal.placeholder_cwd": "Working directory (optional)",
  "group.Shells": "Shells",
  "group.AI Tools": "AI Tools",
  "group.Connections": "Connections",
  "group.Tools": "Tools",
  "statusbar.pid": "PID",
  "statusbar.cwd": "CWD",
  "statusbar.uptime": "uptime",
};

export const messages: Record<Language, MessageDict> = { "zh-CN": zhCN, en };
