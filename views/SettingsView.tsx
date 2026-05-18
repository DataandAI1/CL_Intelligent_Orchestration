import React, { useState, useEffect } from 'react';
import { useSettingsContext } from '../services/settings/SettingsContext';
import { createProvider, OllamaProvider } from '../services/llm/index';
import type { LlmSettings, ProviderId } from '../services/llm/index';

type TestStatus = { kind: 'success' | 'error' | 'info'; message: string } | null;

const GeminiIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
    <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" stroke="#D4B980" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="2" fill="#D4B980" />
  </svg>
);

const OllamaIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
    <rect x="4" y="8" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="9" cy="5" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="15" cy="5" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M9 7v1M15 7v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="9" cy="14" r="1.5" fill="#D4B980"/>
    <circle cx="15" cy="14" r="1.5" fill="#D4B980"/>
    <path d="M10 17.5c.667.333 3.333.333 4 0" stroke="#D4B980" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const EyeIcon = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </>
    )}
  </svg>
);

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
    <path d="M23 4v6h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const WarningIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const SettingsView: React.FC = () => {
  const { settings, saveSettings } = useSettingsContext();

  const [selectedProvider, setSelectedProvider] = useState<ProviderId>(
    settings?.provider ?? 'gemini'
  );
  const [geminiKey, setGeminiKey] = useState(settings?.gemini?.apiKey ?? '');
  const [showKey, setShowKey] = useState(false);
  const [ollamaUrl, setOllamaUrl] = useState(
    settings?.ollama?.baseUrl ?? 'http://localhost:11434'
  );
  const [ollamaModel, setOllamaModel] = useState(settings?.ollama?.model ?? '');
  const [modelList, setModelList] = useState<string[]>([]);
  const [modelListError, setModelListError] = useState<string | null>(null);
  const [modelListLoading, setModelListLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>(null);
  const [testing, setTesting] = useState(false);

  const fetchModels = async (url: string) => {
    setModelListLoading(true);
    setModelListError(null);
    const models = await OllamaProvider.listModels(url);
    if (models.length === 0) {
      setModelListError(url);
      setModelList([]);
    } else {
      setModelList(models);
      setModelListError(null);
      if (!ollamaModel || !models.includes(ollamaModel)) {
        setOllamaModel(models[0]);
      }
    }
    setModelListLoading(false);
  };

  useEffect(() => {
    if (selectedProvider === 'ollama') {
      fetchModels(ollamaUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvider]);

  const canAct =
    selectedProvider === 'gemini'
      ? geminiKey.trim().length > 0
      : ollamaUrl.trim().length > 0 && ollamaModel.trim().length > 0;

  const currentFormSettings = (): LlmSettings => {
    if (selectedProvider === 'gemini') {
      return { provider: 'gemini', gemini: { apiKey: geminiKey.trim() } };
    }
    return {
      provider: 'ollama',
      ollama: { baseUrl: ollamaUrl.trim(), model: ollamaModel.trim() },
    };
  };

  const handleTestConnection = async () => {
    if (!canAct) return;
    setTesting(true);
    setTestStatus(null);
    try {
      const provider = createProvider(currentFormSettings());
      const result = await provider.testConnection();
      setTestStatus({
        kind: result.ok ? 'success' : 'error',
        message: result.detail,
      });
    } catch (err: any) {
      setTestStatus({ kind: 'error', message: err?.message ?? 'Unknown error' });
    }
    setTesting(false);
  };

  const handleSave = () => {
    if (!canAct) return;
    saveSettings(currentFormSettings());
    setTestStatus({ kind: 'info', message: 'Settings saved.' });
  };

  const statusBorderColor = (kind: 'success' | 'error' | 'info') => {
    if (kind === 'success') return 'border-[#2E7D32] text-[#2E7D32]';
    if (kind === 'error') return 'border-[#C62828] text-[#C62828]';
    return 'border-[#2A5F8C] text-[#B8B8B8]';
  };

  return (
    <div className="h-full overflow-y-auto bg-[#1A1A1A] custom-scrollbar">
      <div className="max-w-3xl mx-auto p-8 md:p-12 pb-24 space-y-10">

        {/* Page header */}
        <div className="border-b border-[#333333] pb-8">
          <h1 className="font-bold uppercase tracking-wider text-[11px] text-[#D4B980] mb-2">
            Configuration
          </h1>
          <h2 className="text-3xl font-bold text-white tracking-tight mb-2">
            Intelligence Engine Settings
          </h2>
          <p className="text-sm text-[#808080]">
            Configure your AI provider for all generation tasks.
          </p>
        </div>

        {/* Provider selector */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-[#808080] uppercase tracking-wider">
            Select Provider
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Gemini card */}
            <button
              onClick={() => { setSelectedProvider('gemini'); setTestStatus(null); }}
              className={`glass-card text-left p-5 rounded-xl border-2 transition-all ${
                selectedProvider === 'gemini'
                  ? 'border-[#2A5F8C] bg-[#2A5F8C]/10'
                  : 'border-transparent hover:border-[#333333]'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-[#D4B980]"><GeminiIcon /></span>
                {selectedProvider === 'gemini' && (
                  <span className="text-[#2A5F8C] text-xs font-bold uppercase tracking-wider">Selected</span>
                )}
              </div>
              <div className="font-bold text-white mb-1">Gemini API</div>
              <div className="text-xs text-[#808080] leading-relaxed">
                Cloud-hosted, fast, structured JSON output.
              </div>
            </button>

            {/* Ollama card */}
            <button
              onClick={() => { setSelectedProvider('ollama'); setTestStatus(null); }}
              className={`glass-card text-left p-5 rounded-xl border-2 transition-all ${
                selectedProvider === 'ollama'
                  ? 'border-[#2A5F8C] bg-[#2A5F8C]/10'
                  : 'border-transparent hover:border-[#333333]'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-[#B8B8B8]"><OllamaIcon /></span>
                {selectedProvider === 'ollama' && (
                  <span className="text-[#2A5F8C] text-xs font-bold uppercase tracking-wider">Selected</span>
                )}
              </div>
              <div className="font-bold text-white mb-1">Local Ollama</div>
              <div className="text-xs text-[#808080] leading-relaxed">
                Private, local, any model from your Ollama install.
              </div>
            </button>
          </div>
        </div>

        {/* Config panel */}
        <div className="glass-panel rounded-xl p-6 space-y-6">
          <h3 className="text-xs font-bold text-[#808080] uppercase tracking-wider border-b border-[#333333] pb-3">
            Provider Configuration
          </h3>

          {selectedProvider === 'gemini' ? (
            <div className="space-y-5">
              {/* API Key */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#808080] uppercase tracking-wider">
                  API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="Enter your Gemini API key..."
                    className="flex-1 bg-[#2A2A2A] border border-[#333333] rounded-lg px-4 py-3 text-white placeholder-[#4A4A4A] focus:border-[#D4B980] focus:outline-none transition-colors text-sm"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="px-3 bg-[#2A2A2A] border border-[#333333] rounded-lg text-[#808080] hover:text-white transition-colors"
                    aria-label={showKey ? 'Hide API key' : 'Show API key'}
                  >
                    <EyeIcon open={showKey} />
                  </button>
                </div>
              </div>

              {/* Model display */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#808080] uppercase tracking-wider">
                  Model
                </label>
                <div className="bg-[#2A2A2A] border border-[#333333] rounded-lg px-4 py-3 text-[#808080] text-sm font-mono">
                  gemini-2.5-flash
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-3 bg-[#F57C00]/10 border border-[#F57C00]/30 rounded-lg px-4 py-3">
                <span className="text-[#F57C00] mt-0.5"><WarningIcon /></span>
                <p className="text-xs text-[#B8B8B8] leading-relaxed">
                  Key stored in browser localStorage — not suitable for shared or public machines.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Server URL */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#808080] uppercase tracking-wider">
                  Server URL
                </label>
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="w-full bg-[#2A2A2A] border border-[#333333] rounded-lg px-4 py-3 text-white placeholder-[#4A4A4A] focus:border-[#D4B980] focus:outline-none transition-colors text-sm font-mono"
                />
              </div>

              {/* Model dropdown */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#808080] uppercase tracking-wider">
                  Model
                </label>
                <div className="flex gap-2">
                  {modelListError ? (
                    <div className="flex-1 bg-[#2A2A2A] border border-[#333333] rounded-lg px-4 py-3 text-[#808080] text-xs">
                      No models available
                    </div>
                  ) : (
                    <select
                      value={ollamaModel}
                      onChange={(e) => setOllamaModel(e.target.value)}
                      disabled={modelListLoading || modelList.length === 0}
                      className="flex-1 bg-[#2A2A2A] border border-[#333333] rounded-lg px-4 py-3 text-white focus:border-[#D4B980] focus:outline-none transition-colors text-sm disabled:opacity-50"
                    >
                      {modelList.length === 0 && (
                        <option value="">
                          {modelListLoading ? 'Loading...' : 'No models found'}
                        </option>
                      )}
                      {modelList.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={() => fetchModels(ollamaUrl)}
                    disabled={modelListLoading}
                    className="px-3 bg-[#2A2A2A] border border-[#333333] rounded-lg text-[#808080] hover:text-white transition-colors disabled:opacity-50"
                    aria-label="Refresh model list"
                  >
                    <span className={modelListLoading ? 'animate-spin inline-block' : ''}>
                      <RefreshIcon />
                    </span>
                  </button>
                </div>
                {modelListError && (
                  <p className="text-xs text-[#F57C00] leading-relaxed">
                    Could not reach Ollama at {modelListError}. Ensure{' '}
                    <code className="font-mono">ollama serve</code> is running and{' '}
                    <code className="font-mono">OLLAMA_ORIGINS</code> includes this app's origin.
                  </p>
                )}
              </div>

              {/* Recommendation */}
              <div className="flex items-start gap-3 bg-[#F57C00]/10 border border-[#F57C00]/30 rounded-lg px-4 py-3">
                <span className="text-[#F57C00] mt-0.5"><WarningIcon /></span>
                <p className="text-xs text-[#B8B8B8] leading-relaxed">
                  Ollama must be running locally. JSON output quality varies by model — recommend 7B+ parameter models.
                </p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleTestConnection}
              disabled={!canAct || testing}
              className="flex-1 bg-[#2A5F8C] hover:bg-[#1A3F5C] disabled:bg-[#333333] disabled:text-[#808080] text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {testing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Testing...</span>
                </>
              ) : (
                'Test Connection'
              )}
            </button>
            <button
              onClick={handleSave}
              disabled={!canAct}
              className="flex-1 bg-[#D4B980] hover:bg-[#C4A870] disabled:bg-[#333333] disabled:text-[#808080] text-[#1A1A1A] font-bold py-3 px-6 rounded-lg transition-colors text-sm"
            >
              Save Settings
            </button>
          </div>

          {/* Status feedback */}
          {testStatus && (
            <div
              className={`border rounded-lg px-4 py-3 text-sm ${statusBorderColor(testStatus.kind)}`}
            >
              {testStatus.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
