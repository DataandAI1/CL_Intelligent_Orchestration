import React from 'react';
import { useSettingsContext } from '../services/settings/SettingsContext';

interface Props {
  message?: string;
}

const GearIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0">
    <path
      d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ConfigureBanner: React.FC<Props> = ({ message }) => {
  const { openSettings } = useSettingsContext();

  return (
    <div className="glass-panel border-l-4 border-[#D4B980] rounded-lg px-5 py-4 flex items-start gap-4 mb-6">
      <span className="text-[#D4B980] mt-0.5">
        <GearIcon />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#B8B8B8] leading-relaxed">
          {message ?? 'Intelligence Engine not configured.'}{' '}
          <button
            onClick={openSettings}
            className="text-[#D4B980] hover:underline font-semibold focus:outline-none"
          >
            Open Settings
          </button>{' '}
          to select Gemini or Ollama before generating.
        </p>
      </div>
    </div>
  );
};
