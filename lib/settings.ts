"use client";

export type Settings = {
  aiProvider: "gemini" | "openai" | "anthropic" | "groq";
  model: string;
  tone: "professional" | "casual" | "friendly" | "direct";
  signature: string;
  inboxCount: number;
};

const DEFAULTS: Settings = {
  aiProvider: "gemini",
  model: "gemini-flash-latest",
  tone: "professional",
  signature: "",
  inboxCount: 20,
};

const KEY = "maildesk-settings";

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(s: Settings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

// Available models per provider
export const MODEL_OPTIONS: Record<Settings["aiProvider"], { id: string; label: string }[]> = {
  gemini: [
    { id: "gemini-flash-latest", label: "Gemini Flash (fast, free)" },
    { id: "gemini-pro-latest", label: "Gemini Pro (smarter, may need paid)" },
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  ],
  openai: [
    { id: "gpt-4o-mini", label: "GPT-4o Mini (fast, cheap)" },
    { id: "gpt-4o", label: "GPT-4o (best quality)" },
  ],
  anthropic: [
    { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (fast)" },
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (smartest)" },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (free, fast)" },
    { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B (fastest)" },
  ],
};