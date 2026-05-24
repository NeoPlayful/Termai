import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "./config.js";

export interface SessionTemplate {
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

const DEFAULT_TEMPLATES: SessionTemplate[] = [
  { id: "bash", name: "Bash Shell", description: "标准 Bash 终端", command: "bash", cwd: "~", icon: "🐚", group: "Shells" },
  { id: "cmd", name: "Command Prompt", description: "Windows 命令提示符", command: "cmd.exe", cwd: "%USERPROFILE%", icon: "🪟", platform: ["win32"], group: "Shells" },
  { id: "powershell", name: "PowerShell", description: "Windows PowerShell", command: "powershell.exe", icon: "🔷", platform: ["win32"], group: "Shells" },
  { id: "claude-code", name: "Claude Code", description: "AI 编程助手", command: "claude", args: ["--dangerously-skip-permissions"], cwd: "~", env: { TERM: "xterm-256color" }, icon: "🤖", platform: ["linux", "darwin"], group: "AI Tools" },
  { id: "ssh-routeros", name: "SSH RouterOS", description: "连接到 MikroTik 路由器", command: "ssh", args: ["admin@192.168.88.1"], cwd: "~", icon: "🌐", group: "Connections" },
  { id: "ssh-server", name: "SSH Remote Server", description: "连接到远程 Linux 服务器", command: "ssh", args: ["user@server.example.com"], cwd: "~", icon: "🖥️", group: "Connections" },
  { id: "htop", name: "System Monitor (htop)", description: "实时系统监控", command: "htop", icon: "📊", group: "Tools" },
];

function loadTemplates(): SessionTemplate[] {
  const tplPath = resolve(process.cwd(), config.templatesPath ?? "templates.json");

  if (!existsSync(tplPath)) {
    writeFileSync(tplPath, JSON.stringify(DEFAULT_TEMPLATES, null, 2));
    return DEFAULT_TEMPLATES;
  }

  try {
    const raw = readFileSync(tplPath, "utf-8");
    const parsed: SessionTemplate[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_TEMPLATES;
  } catch {
    console.warn("templates.json parse error, using defaults");
    return DEFAULT_TEMPLATES;
  }
}

let templates = loadTemplates();

export function getTemplates(): SessionTemplate[] {
  return templates.filter(
    (t) => !t.platform || t.platform.includes(process.platform)
  );
}

export function applyTemplate(
  templateId: string,
  overrides: Partial<Pick<SessionTemplate, "id" | "name" | "cwd">>
): { id: string; name: string; command: string; args: string[]; cwd: string; env: Record<string, string> } | null {
  const tpl = templates.find((t) => t.id === templateId);
  if (!tpl) return null;

  return {
    id: overrides.id ?? tpl.id,
    name: overrides.name ?? tpl.name,
    command: tpl.command,
    args: tpl.args ?? [],
    cwd: overrides.cwd ?? tpl.cwd ?? "~",
    env: tpl.env ?? {},
  };
}
