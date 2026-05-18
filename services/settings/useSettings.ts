import { useState, useEffect } from 'react';
import { LlmSettings } from '../llm/types';

const STORAGE_KEY = 'cl-intelligence-engine';

function isConfiguredSettings(settings: LlmSettings | null): boolean {
  if (!settings) return false;
  if (settings.provider === 'gemini') {
    return Boolean(settings.gemini?.apiKey);
  }
  if (settings.provider === 'ollama') {
    return Boolean(settings.ollama?.baseUrl && settings.ollama?.model);
  }
  return false;
}

export function useSettings(): [LlmSettings | null, (s: LlmSettings) => void, boolean] {
  const [settings, setSettings] = useState<LlmSettings | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as LlmSettings) : null;
    } catch {
      // Corrupted localStorage data — treat as no settings
      return null;
    }
  });

  const saveSettings = (s: LlmSettings) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setSettings(s);
  };

  const isConfigured = isConfiguredSettings(settings);

  return [settings, saveSettings, isConfigured];
}
