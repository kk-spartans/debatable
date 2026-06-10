import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parseConfig, DEFAULTS, type Theme } from "./theme.ts";

function xdgConfigHome(): string {
  return process.env.XDG_CONFIG_HOME || join(process.env.HOME || "/tmp", ".config");
}

function configDir(): string {
  return join(xdgConfigHome(), "debatable");
}

function configPath(): string {
  return join(configDir(), "config.json");
}

export function readTheme(): Theme {
  const path = configPath();
  if (!existsSync(path)) {
    return { ...DEFAULTS };
  }
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw);
    return parseConfig(parsed).theme;
  } catch {
    return { ...DEFAULTS };
  }
}
