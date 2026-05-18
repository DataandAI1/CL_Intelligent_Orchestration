import React, { createContext, useContext } from 'react';
import { LlmSettings } from '../llm/types';
import { useSettings } from './useSettings';

interface SettingsContextValue {
  settings: LlmSettings | null;
  saveSettings: (s: LlmSettings) => void;
  isConfigured: boolean;
  openSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

interface SettingsProviderProps {
  children: React.ReactNode;
  onOpenSettings: () => void;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children, onOpenSettings }) => {
  const [settings, saveSettings, isConfigured] = useSettings();

  return (
    <SettingsContext.Provider value={{ settings, saveSettings, isConfigured, openSettings: onOpenSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export function useSettingsContext(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettingsContext must be used within a SettingsProvider');
  }
  return ctx;
}
