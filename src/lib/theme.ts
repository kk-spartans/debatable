export interface Theme {
  accent: string;
  pro: string;
  con: string;
  text: string;
  subtext: string;
  surface0: string;
  muted: string;
}

export interface Config {
  theme: Theme;
}

export const DEFAULTS: Theme = {
  accent: "#f5c2e7",
  pro: "#89b4fa",
  con: "#f38ba8",
  text: "#cdd6f4",
  subtext: "#a6adc8",
  surface0: "#313244",
  muted: "#6c7086",
};

function readTheme(raw: Partial<Record<keyof Theme, string>> | undefined): Theme {
  if (!raw) return { ...DEFAULTS };
  return {
    accent: raw.accent ?? DEFAULTS.accent,
    pro: raw.pro ?? DEFAULTS.pro,
    con: raw.con ?? DEFAULTS.con,
    text: raw.text ?? DEFAULTS.text,
    subtext: raw.subtext ?? DEFAULTS.subtext,
    surface0: raw.surface0 ?? DEFAULTS.surface0,
    muted: raw.muted ?? DEFAULTS.muted,
  };
}

export function parseConfig(raw: unknown): Config {
  if (!raw || typeof raw !== "object") return { theme: { ...DEFAULTS } };
  const obj = raw as Record<string, unknown>;
  const themeRaw = obj.theme as Partial<Record<keyof Theme, string>> | undefined;
  return { theme: readTheme(themeRaw) };
}
