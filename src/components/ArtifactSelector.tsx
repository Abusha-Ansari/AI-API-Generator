import React, { useRef, useState } from 'react';
import {
  Check,
  Cpu,
  Eye,
  EyeOff,
  FileKey2,
  KeyRound,
  Loader2,
  Play,
  RefreshCw,
  Square,
  Trash2,
} from 'lucide-react';
import { ARTIFACT_META, ARTIFACT_ORDER } from '../lib/artifacts.ts';
import type {
  ArtifactType,
  GenerationOptions,
  ProviderId,
  ProviderModelPreset,
  ProviderOption,
} from '../types/index.ts';

interface ArtifactSelectorProps {
  selectedArtifacts: ArtifactType[];
  onToggleArtifact: (artifact: ArtifactType) => void;
  onSelectAll: () => void;
  provider: ProviderId;
  onProviderChange: (provider: ProviderId) => void;
  providers: ProviderOption[];
  model: string;
  onModelChange: (model: string) => void;
  fetchedModels: Partial<Record<ProviderId, ProviderModelPreset[]>>;
  onFetchModels: () => Promise<void>;
  isFetchingModels: boolean;
  modelsError: string | null;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  rememberKey: boolean;
  onRememberKeyChange: (remember: boolean) => void;
  options: GenerationOptions;
  onOptionsChange: (options: GenerationOptions) => void;
  isGenerating: boolean;
  canGenerate: boolean;
  onGenerate: () => void;
  onStop: () => void;
}

function parseKeyFromFileText(content: string, provider: ProviderId): string {
  const trimmed = content.trim();
  if (!trimmed) return '';

  // Support JSON key files
  if (trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>;
      const envKeyName =
        provider === 'gemini'
          ? 'GEMINI_API_KEY'
          : provider === 'openai'
            ? 'OPENAI_API_KEY'
            : 'ANTHROPIC_API_KEY';
      const candidate =
        obj[envKeyName] ?? obj[provider] ?? obj.apiKey ?? obj.api_key ?? obj.key;
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    } catch {
      // Fall through to line parsing
    }
  }

  // Support .env files (e.g. GEMINI_API_KEY="...")
  const targetVar =
    provider === 'gemini'
      ? 'GEMINI_API_KEY'
      : provider === 'openai'
        ? 'OPENAI_API_KEY'
        : 'ANTHROPIC_API_KEY';

  const lines = trimmed.split(/\r?\n/);
  for (const line of lines) {
    const clean = line.trim();
    if (!clean || clean.startsWith('#')) continue;
    const eqIndex = clean.indexOf('=');
    if (eqIndex > 0) {
      const name = clean.slice(0, eqIndex).trim();
      const val = clean
        .slice(eqIndex + 1)
        .trim()
        .replace(/^["']|["']$/g, '');
      if (name === targetVar && val) {
        return val;
      }
    }
  }

  // Fallback: first non-comment line as a raw key
  const firstLine = lines.find((l) => l.trim() && !l.trim().startsWith('#'));
  return firstLine ? firstLine.trim().replace(/^["']|["']$/g, '') : '';
}

export const ArtifactSelector: React.FC<ArtifactSelectorProps> = ({
  selectedArtifacts,
  onToggleArtifact,
  onSelectAll,
  provider,
  onProviderChange,
  providers,
  model,
  onModelChange,
  fetchedModels,
  onFetchModels,
  isFetchingModels,
  modelsError,
  apiKey,
  onApiKeyChange,
  rememberKey,
  onRememberKeyChange,
  options,
  onOptionsChange,
  isGenerating,
  canGenerate,
  onGenerate,
  onStop,
}) => {
  const [showKey, setShowKey] = useState(false);
  const [useCustomModel, setUseCustomModel] = useState(false);
  const keyFileInputRef = useRef<HTMLInputElement | null>(null);

  const allSelected = selectedArtifacts.length === ARTIFACT_ORDER.length;
  const activeProviderMeta =
    providers.find((p) => p.id === provider) || providers[0];

  const modelChoices: ProviderModelPreset[] =
    fetchedModels[provider] && fetchedModels[provider]!.length > 0
      ? fetchedModels[provider]!
      : activeProviderMeta?.presetModels || [];

  const hasValidKeySource =
    Boolean(apiKey.trim()) || Boolean(activeProviderMeta?.hasServerFallbackKey);

  const handleLoadKeyFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const extracted = parseKeyFromFileText(reader.result, provider);
        if (extracted) {
          onApiKeyChange(extracted);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <section
      aria-label="Artifacts and provider configuration"
      className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#13151A] overflow-hidden"
    >
      {/* Artifact Selection Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Target Artifacts
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
            {selectedArtifacts.length} of {ARTIFACT_ORDER.length} selected
          </p>
        </div>
        <button
          type="button"
          onClick={onSelectAll}
          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
        >
          {allSelected ? 'Select SDK only' : 'Select all 5'}
        </button>
      </div>

      {/* 5 Artifact Checkboxes */}
      <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
        {ARTIFACT_ORDER.map((id, idx) => {
          const meta = ARTIFACT_META[id];
          const checked = selectedArtifacts.includes(id);

          return (
            <label
              key={id}
              className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                checked
                  ? 'bg-blue-500/[0.04] dark:bg-blue-500/[0.06]'
                  : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggleArtifact(id)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                  checked
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-slate-300 dark:border-white/20 bg-white dark:bg-[#0D0F14]'
                }`}
              >
                {checked && <Check className="w-3 h-3 stroke-[2.5]" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    0{idx + 1}. {meta.label}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                    .{meta.extension}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {meta.description}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      {/* Artifact Dialect Options */}
      {(selectedArtifacts.includes('sdk') || selectedArtifacts.includes('tests')) && (
        <div className="px-4 py-3 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50/60 dark:bg-[#101217] flex flex-wrap items-center gap-4">
          {selectedArtifacts.includes('sdk') && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                SDK Client:
              </span>
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/70 dark:bg-[#0B0C0F]">
                {(['fetch', 'axios'] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => onOptionsChange({ ...options, sdkStyle: style })}
                    className={`px-2.5 py-1 text-[11px] font-mono font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      options.sdkStyle === style
                        ? 'bg-white dark:bg-[#1C202B] text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedArtifacts.includes('tests') && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                Test Runner:
              </span>
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/70 dark:bg-[#0B0C0F]">
                {(['vitest', 'jest'] as const).map((fw) => (
                  <button
                    key={fw}
                    type="button"
                    onClick={() => onOptionsChange({ ...options, testFramework: fw })}
                    className={`px-2.5 py-1 text-[11px] font-mono font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      options.testFramework === fw
                        ? 'bg-white dark:bg-[#1C202B] text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {fw}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Provider, User API Key & Model Selection */}
      <div className="px-4 py-4 border-t border-slate-200 dark:border-white/[0.08] space-y-4">
        {/* Provider Segmented Picker */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                LLM Provider
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Bring your own key
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-[#0B0C0F]">
            {providers.map((item) => {
              const active = provider === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onProviderChange(item.id)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap truncate cursor-pointer ${
                    active
                      ? 'bg-white dark:bg-[#1C202B] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* User API Key Input + File Loader */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label
              htmlFor="user-api-key-input"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>{activeProviderMeta?.label} API Key</span>
            </label>

            <div className="flex items-center gap-2">
              <input
                ref={keyFileInputRef}
                type="file"
                accept=".env,.txt,.key,.json"
                onChange={handleLoadKeyFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => keyFileInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                <FileKey2 className="w-3 h-3" />
                Load key file
              </button>
              {apiKey && (
                <button
                  type="button"
                  onClick={() => onApiKeyChange('')}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-red-500 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="relative flex items-center">
            <input
              id="user-api-key-input"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder={
                activeProviderMeta?.hasServerFallbackKey
                  ? `Optional (server fallback active) or paste ${activeProviderMeta.keyPlaceholder}`
                  : `Paste your ${activeProviderMeta?.label} key (${activeProviderMeta?.keyPlaceholder || '...'})`
              }
              className="w-full pr-9 pl-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0D0F14] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              aria-label={showKey ? 'Hide API key' : 'Show API key'}
              className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberKey}
                onChange={(e) => onRememberKeyChange(e.target.checked)}
                className="rounded border-slate-300 dark:border-white/20 accent-blue-600"
              />
              Remember key in browser storage
            </label>
            <span>
              {apiKey.trim()
                ? 'Sent per-request only'
                : activeProviderMeta?.hasServerFallbackKey
                  ? 'Server fallback active'
                  : 'Key required'}
            </span>
          </div>
        </div>

        {/* User Model Selection */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label
              htmlFor="user-model-select"
              className="text-xs font-semibold text-slate-900 dark:text-white"
            >
              Model
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isFetchingModels || !hasValidKeySource}
                onClick={() => void onFetchModels()}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
              >
                {isFetchingModels ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                Fetch live models
              </button>
              <button
                type="button"
                onClick={() => setUseCustomModel((v) => !v)}
                className="text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                {useCustomModel ? 'Use preset list' : 'Custom model ID'}
              </button>
            </div>
          </div>

          {useCustomModel ? (
            <input
              id="user-model-select"
              type="text"
              value={model}
              onChange={(e) => onModelChange(e.target.value)}
              placeholder={activeProviderMeta?.defaultModel || 'Enter exact model ID'}
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0D0F14] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <select
              id="user-model-select"
              value={model}
              onChange={(e) => onModelChange(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0D0F14] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {!modelChoices.some((m) => m.id === model) && model && (
                <option value={model}>{model}</option>
              )}
              {modelChoices.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          )}

          {modelsError && (
            <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">{modelsError}</p>
          )}
        </div>
      </div>

      {/* Primary Generate / Stop Button */}
      <div className="px-4 py-3.5 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#101217]">
        {isGenerating ? (
          <button
            type="button"
            onClick={onStop}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors cursor-pointer"
          >
            <Square className="w-4 h-4 fill-current" />
            Stop Streaming
          </button>
        ) : (
          <button
            type="button"
            disabled={!canGenerate || selectedArtifacts.length === 0 || !hasValidKeySource || !model.trim()}
            onClick={onGenerate}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Generate {selectedArtifacts.length}{' '}
            {selectedArtifacts.length === 1 ? 'Artifact' : 'Artifacts'}
          </button>
        )}
        {!hasValidKeySource && (
          <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400 text-center">
            Enter or load your {activeProviderMeta?.label} API key above to enable generation.
          </p>
        )}
      </div>
    </section>
  );
};
