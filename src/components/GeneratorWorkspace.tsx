import React, { useCallback, useEffect, useRef, useState } from 'react';
import { History, Moon, Share2, Sun, Trash2, X } from 'lucide-react';
import { ARTIFACT_ORDER } from '../lib/artifacts.ts';
import { SAMPLE_SPECS } from '../lib/sample-specs.ts';
import { ArtifactSelector } from './ArtifactSelector.tsx';
import { OutputPanel } from './OutputPanel.tsx';
import { SpecInput } from './SpecInput.tsx';
import type {
  ArtifactOutputState,
  ArtifactType,
  GenerationOptions,
  HistoryEntry,
  ParsedSpecSummary,
  ProviderId,
  ProviderModelPreset,
  ProviderOption,
} from '../types/index.ts';

interface GeneratorWorkspaceProps {
  initialSpec?: string;
  isDark: boolean;
  onToggleTheme: () => void;
}

const HISTORY_STORAGE_KEY = 'specforge_generation_history_v1';
const KEY_STORAGE_PREFIX = 'specforge_user_key_';
const MODEL_STORAGE_PREFIX = 'specforge_user_model_';
const REMEMBER_STORAGE_KEY = 'specforge_remember_keys';

const DEFAULT_PROVIDERS: ProviderOption[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    vendor: 'Google Gemini',
    defaultModel: 'gemini-4-hydrogen',
    presetModels: [
      { id: 'gemini-4-hydrogen', label: 'Gemini 4 Hydrogen' },
      { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite' },
      { id: 'gemini-4-argon', label: 'Gemini 4 Argon (Paid Key)' },
      { id: 'gemini-4-carbon', label: 'Gemini 4 Carbon (Paid Key)' },
    ],
    hasServerFallbackKey: false,
    keyPlaceholder: 'AIza...',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    vendor: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    presetModels: [
      { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
      { id: 'o3-mini', label: 'o3-mini' },
    ],
    hasServerFallbackKey: false,
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    vendor: 'Anthropic',
    defaultModel: 'claude-3-5-haiku-latest',
    presetModels: [
      { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' },
      { id: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet' },
      { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    ],
    hasServerFallbackKey: false,
    keyPlaceholder: 'sk-ant-...',
  },
];

function loadStoredKey(provider: ProviderId): string {
  try {
    return (
      localStorage.getItem(`${KEY_STORAGE_PREFIX}${provider}`) ||
      sessionStorage.getItem(`${KEY_STORAGE_PREFIX}${provider}`) ||
      ''
    );
  } catch {
    return '';
  }
}

function loadStoredModel(provider: ProviderId, fallback: string): string {
  try {
    return localStorage.getItem(`${MODEL_STORAGE_PREFIX}${provider}`) || fallback;
  } catch {
    return fallback;
  }
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries.slice(0, 12)));
  } catch {
    // Ignore storage quota errors
  }
}

export const GeneratorWorkspace: React.FC<GeneratorWorkspaceProps> = ({
  initialSpec,
  isDark,
  onToggleTheme,
}) => {
  const [specText, setSpecText] = useState<string>(
    () => initialSpec || SAMPLE_SPECS[0].spec,
  );
  const [parsedSummary, setParsedSummary] = useState<ParsedSpecSummary | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  const [selectedArtifacts, setSelectedArtifacts] = useState<ArtifactType[]>([
    'sdk',
    'docs',
    'tests',
    'postman',
    'examples',
  ]);
  const [activeTab, setActiveTab] = useState<ArtifactType>('sdk');

  const [providers, setProviders] = useState<ProviderOption[]>(DEFAULT_PROVIDERS);
  const [provider, setProvider] = useState<ProviderId>('gemini');
  const [rememberKey, setRememberKey] = useState<boolean>(() => {
    try {
      return localStorage.getItem(REMEMBER_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [apiKeys, setApiKeys] = useState<Record<ProviderId, string>>(() => ({
    gemini: loadStoredKey('gemini'),
    openai: loadStoredKey('openai'),
    anthropic: loadStoredKey('anthropic'),
  }));
  const [modelsByProvider, setModelsByProvider] = useState<Record<ProviderId, string>>(() => ({
    gemini: loadStoredModel('gemini', 'gemini-4-hydrogen'),
    openai: loadStoredModel('openai', 'gpt-4o-mini'),
    anthropic: loadStoredModel('anthropic', 'claude-3-5-haiku-latest'),
  }));
  const [fetchedModels, setFetchedModels] = useState<
    Partial<Record<ProviderId, ProviderModelPreset[]>>
  >({});
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const [options, setOptions] = useState<GenerationOptions>({
    sdkStyle: 'fetch',
    testFramework: 'vitest',
  });

  const [outputs, setOutputs] = useState<Partial<Record<ArtifactType, ArtifactOutputState>>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [showHistory, setShowHistory] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const currentApiKey = apiKeys[provider] || '';
  const currentModel = modelsByProvider[provider] || 'gemini-4-hydrogen';

  const handleApiKeyChange = (nextKey: string) => {
    setApiKeys((prev) => ({ ...prev, [provider]: nextKey }));
    setModelsError(null);
    try {
      if (rememberKey) {
        if (nextKey) localStorage.setItem(`${KEY_STORAGE_PREFIX}${provider}`, nextKey);
        else localStorage.removeItem(`${KEY_STORAGE_PREFIX}${provider}`);
        sessionStorage.removeItem(`${KEY_STORAGE_PREFIX}${provider}`);
      } else {
        if (nextKey) sessionStorage.setItem(`${KEY_STORAGE_PREFIX}${provider}`, nextKey);
        else sessionStorage.removeItem(`${KEY_STORAGE_PREFIX}${provider}`);
        localStorage.removeItem(`${KEY_STORAGE_PREFIX}${provider}`);
      }
    } catch {
      // Ignore storage errors
    }
  };

  const handleRememberKeyChange = (nextRemember: boolean) => {
    setRememberKey(nextRemember);
    try {
      localStorage.setItem(REMEMBER_STORAGE_KEY, String(nextRemember));
      (['gemini', 'openai', 'anthropic'] as ProviderId[]).forEach((p) => {
        const val = apiKeys[p];
        if (nextRemember) {
          if (val) localStorage.setItem(`${KEY_STORAGE_PREFIX}${p}`, val);
          sessionStorage.removeItem(`${KEY_STORAGE_PREFIX}${p}`);
        } else {
          if (val) sessionStorage.setItem(`${KEY_STORAGE_PREFIX}${p}`, val);
          localStorage.removeItem(`${KEY_STORAGE_PREFIX}${p}`);
        }
      });
    } catch {
      // Ignore storage errors
    }
  };

  const handleModelChange = (nextModel: string) => {
    setModelsByProvider((prev) => ({ ...prev, [provider]: nextModel }));
    try {
      localStorage.setItem(`${MODEL_STORAGE_PREFIX}${provider}`, nextModel);
    } catch {
      // Ignore storage errors
    }
  };

  const handleProviderChange = (nextProvider: ProviderId) => {
    setProvider(nextProvider);
    setModelsError(null);
  };

  const handleFetchModels = async () => {
    setIsFetchingModels(true);
    setModelsError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (currentApiKey.trim()) {
        headers['x-provider-api-key'] = currentApiKey.trim();
      }
      const resp = await fetch('/api/models', {
        method: 'POST',
        headers,
        body: JSON.stringify({ provider }),
      });
      const data = (await resp.json()) as {
        models?: ProviderModelPreset[];
        error?: string;
      };
      if (!resp.ok || !Array.isArray(data.models)) {
        throw new Error(data.error || 'Failed to fetch available models.');
      }
      setFetchedModels((prev) => ({ ...prev, [provider]: data.models }));
      if (
        data.models.length > 0 &&
        !data.models.some((m) => m.id === currentModel)
      ) {
        handleModelChange(data.models[0].id);
      }
    } catch (err) {
      setModelsError(err instanceof Error ? err.message : 'Unable to fetch models.');
    } finally {
      setIsFetchingModels(false);
    }
  };

  const validateSpec = useCallback(async (overrideSpec?: string): Promise<ParsedSpecSummary | null> => {
    const target = overrideSpec ?? specText;
    if (!target.trim()) {
      setParsedSummary(null);
      setValidationError('Specification input is empty.');
      return null;
    }

    setIsValidating(true);
    setValidationError(null);
    try {
      const resp = await fetch('/api/parse-spec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec: target }),
      });
      const data = (await resp.json()) as ParsedSpecSummary & { error?: string };
      if (!resp.ok) {
        setParsedSummary(null);
        setValidationError(data.error || 'Failed to validate OpenAPI specification.');
        return null;
      }
      setParsedSummary(data);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error during validation.';
      setValidationError(msg);
      setParsedSummary(null);
      return null;
    } finally {
      setIsValidating(false);
    }
  }, [specText]);

  // Fetch provider metadata & optional server fallback status
  useEffect(() => {
    fetch('/api/providers')
      .then((r) => r.json())
      .then((data: { providers?: ProviderOption[] }) => {
        if (Array.isArray(data.providers) && data.providers.length > 0) {
          setProviders(data.providers);
        }
      })
      .catch(() => {
        // Keep default list
      });
  }, []);

  useEffect(() => {
    if (initialSpec) {
      setSpecText(initialSpec);
      void validateSpec(initialSpec);
    } else {
      void validateSpec(SAMPLE_SPECS[0].spec);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSpec]);

  const handleFetchUrl = async (url: string) => {
    setIsFetchingUrl(true);
    setValidationError(null);
    try {
      const resp = await fetch('/api/fetch-spec-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = (await resp.json()) as {
        spec?: string;
        summary?: ParsedSpecSummary;
        error?: string;
      };
      if (!resp.ok || !data.spec || !data.summary) {
        setValidationError(data.error || 'Failed to load specification from URL.');
        return;
      }
      setSpecText(data.spec);
      setParsedSummary(data.summary);
      setOutputs({});
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to fetch specification URL.');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleToggleArtifact = (artifact: ArtifactType) => {
    setSelectedArtifacts((prev) => {
      if (prev.includes(artifact)) {
        if (prev.length === 1) return prev;
        const next = prev.filter((item) => item !== artifact);
        if (activeTab === artifact) {
          setActiveTab(next[0]);
        }
        return next;
      }
      return ARTIFACT_ORDER.filter((id) => prev.includes(id) || id === artifact);
    });
  };

  const handleSelectAll = () => {
    if (selectedArtifacts.length === ARTIFACT_ORDER.length) {
      setSelectedArtifacts(['sdk']);
      setActiveTab('sdk');
    } else {
      setSelectedArtifacts([...ARTIFACT_ORDER]);
    }
  };

  const streamSingleArtifact = async (
    artifact: ArtifactType,
    specPayload: string,
    signal: AbortSignal,
  ): Promise<string | null> => {
    const startedAt = Date.now();
    setOutputs((prev) => ({
      ...prev,
      [artifact]: { status: 'streaming', content: '', startedAt },
    }));

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (currentApiKey.trim()) {
        headers['x-provider-api-key'] = currentApiKey.trim();
      }

      const resp = await fetch('/api/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          spec: specPayload,
          artifact,
          provider,
          model: currentModel,
          options,
        }),
        signal,
      });

      if (!resp.ok || !resp.body) {
        const errPayload = (await resp.json().catch(() => ({}))) as { error?: string };
        throw new Error(errPayload.error || `HTTP ${resp.status} while streaming ${artifact}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';
      let currentEvent = 'chunk';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim();
            continue;
          }
          if (!line.startsWith('data:')) continue;
          const rawData = line.slice(5).trim();
          if (!rawData) continue;

          try {
            const parsed = JSON.parse(rawData) as { text?: string; error?: string };
            if (currentEvent === 'error') {
              throw new Error(parsed.error || 'Model stream returned an error.');
            }
            if (currentEvent === 'chunk' && parsed.text) {
              accumulated += parsed.text;
              setOutputs((prev) => ({
                ...prev,
                [artifact]: {
                  status: 'streaming',
                  content: accumulated,
                  startedAt,
                },
              }));
            }
          } catch (innerErr) {
            if (currentEvent === 'error') {
              throw innerErr;
            }
          }
        }
      }

      setOutputs((prev) => ({
        ...prev,
        [artifact]: {
          status: 'complete',
          content: accumulated,
          startedAt,
          completedAt: Date.now(),
        },
      }));
      return accumulated;
    } catch (err) {
      if (signal.aborted) {
        setOutputs((prev) => ({
          ...prev,
          [artifact]: {
            status: prev[artifact]?.content ? 'complete' : 'idle',
            content: prev[artifact]?.content || '',
          },
        }));
        return null;
      }
      const message = err instanceof Error ? err.message : 'Streaming failed.';
      setOutputs((prev) => ({
        ...prev,
        [artifact]: {
          status: 'error',
          content: '',
          error: message,
          startedAt,
        },
      }));
      return null;
    }
  };

  const handleGenerate = useCallback(async () => {
    if (isGenerating || selectedArtifacts.length === 0) return;

    const summary = parsedSummary || (await validateSpec());
    if (!summary) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setIsGenerating(true);

    if (!selectedArtifacts.includes(activeTab)) {
      setActiveTab(selectedArtifacts[0]);
    }

    const initialMap: Partial<Record<ArtifactType, ArtifactOutputState>> = {};
    for (const id of selectedArtifacts) {
      initialMap[id] = { status: 'streaming', content: '', startedAt: Date.now() };
    }
    setOutputs(initialMap);

    const completedOutputs: Partial<Record<ArtifactType, string>> = {};

    await Promise.all(
      selectedArtifacts.map(async (artifactId) => {
        const result = await streamSingleArtifact(artifactId, specText, controller.signal);
        if (result) {
          completedOutputs[artifactId] = result;
        }
      }),
    );

    setIsGenerating(false);
    abortRef.current = null;

    if (!controller.signal.aborted && Object.keys(completedOutputs).length > 0) {
      const entry: HistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: Date.now(),
        specTitle: summary.title,
        specVersion: summary.version,
        endpointCount: summary.endpointCount,
        provider,
        model: currentModel,
        artifacts: [...selectedArtifacts],
        specRaw: specText,
        outputs: completedOutputs,
      };
      setHistory((prev) => {
        const updated = [entry, ...prev].slice(0, 12);
        saveHistory(updated);
        return updated;
      });
    }
  }, [
    isGenerating,
    selectedArtifacts,
    parsedSummary,
    validateSpec,
    activeTab,
    specText,
    provider,
    currentModel,
    currentApiKey,
    options,
  ]);

  const handleStop = () => {
    abortRef.current?.abort();
    setIsGenerating(false);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        void handleGenerate();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleGenerate]);

  const handleLoadPreset = (presetId: string) => {
    const found = SAMPLE_SPECS.find((s) => s.id === presetId);
    if (!found) return;
    setSpecText(found.spec);
    setOutputs({});
    void validateSpec(found.spec);
  };

  const handleRestoreHistory = (entry: HistoryEntry) => {
    setSpecText(entry.specRaw);
    setSelectedArtifacts(entry.artifacts);
    setActiveTab(entry.artifacts[0] || 'sdk');
    if (entry.provider) {
      setProvider(entry.provider);
    }
    if (entry.model) {
      setModelsByProvider((prev) => ({ ...prev, [entry.provider || provider]: entry.model }));
    }
    const restoredOutputs: Partial<Record<ArtifactType, ArtifactOutputState>> = {};
    for (const [k, v] of Object.entries(entry.outputs)) {
      if (v) {
        restoredOutputs[k as ArtifactType] = {
          status: 'complete',
          content: v,
        };
      }
    }
    setOutputs(restoredOutputs);
    void validateSpec(entry.specRaw);
    setShowHistory(false);
  };

  const handleShareLink = async () => {
    try {
      const encoded = btoa(unescape(encodeURIComponent(specText)));
      if (encoded.length > 16000) {
        await navigator.clipboard.writeText(window.location.href);
      } else {
        const shareUrl = `${window.location.origin}/generate#spec=${encoded}`;
        window.history.replaceState(null, '', `/generate#spec=${encoded}`);
        await navigator.clipboard.writeText(shareUrl);
      }
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-6">
      {/* Workspace Toolbar */}
      <div className="mb-6 pb-4 border-b border-slate-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Workspace / OpenAPI Transformer
          </div>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
            ·
          </span>
          <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span>Sample Preset:</span>
            <select
              onChange={(e) => {
                if (e.target.value) handleLoadPreset(e.target.value);
              }}
              defaultValue={SAMPLE_SPECS[0].id}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#13151A] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {SAMPLE_SPECS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleShareLink()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#13151A] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            {shareCopied ? 'Link Copied' : 'Share Spec'}
          </button>

          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#13151A] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            History ({history.length})
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#13151A] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {isDark ? 'Light' : 'Dark'}
          </button>
        </div>
      </div>

      {/* Collapsible History Panel */}
      {showHistory && (
        <div className="mb-6 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#13151A] p-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                Recent Generation Runs
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Saved locally in browser storage for instant restoration.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setHistory([]);
                    saveHistory([]);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                aria-label="Close history"
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="text-xs text-slate-500 dark:text-slate-400 py-4">
              No saved runs yet. Generate artifacts to save your first snapshot.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {history.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => handleRestoreHistory(entry)}
                  className="text-left p-3 rounded-lg border border-slate-200 dark:border-white/[0.08] hover:border-blue-500/50 bg-slate-50 dark:bg-[#0D0F14] transition-colors cursor-pointer"
                >
                  <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {entry.specTitle}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1 tabular-nums truncate">
                    {entry.endpointCount} endpoints · {entry.model || entry.provider}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {new Date(entry.createdAt).toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main 12-Column Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 flex flex-col gap-6">
          <SpecInput
            specText={specText}
            onSpecChange={(next) => {
              setSpecText(next);
              setValidationError(null);
            }}
            parsedSummary={parsedSummary}
            validationError={validationError}
            isValidating={isValidating}
            onValidate={async (override) => {
              await validateSpec(override);
            }}
            onFetchUrl={handleFetchUrl}
            isFetchingUrl={isFetchingUrl}
          />

          <ArtifactSelector
            selectedArtifacts={selectedArtifacts}
            onToggleArtifact={handleToggleArtifact}
            onSelectAll={handleSelectAll}
            provider={provider}
            onProviderChange={handleProviderChange}
            providers={providers}
            model={currentModel}
            onModelChange={handleModelChange}
            fetchedModels={fetchedModels}
            onFetchModels={handleFetchModels}
            isFetchingModels={isFetchingModels}
            modelsError={modelsError}
            apiKey={currentApiKey}
            onApiKeyChange={handleApiKeyChange}
            rememberKey={rememberKey}
            onRememberKeyChange={handleRememberKeyChange}
            options={options}
            onOptionsChange={setOptions}
            isGenerating={isGenerating}
            canGenerate={Boolean(specText.trim())}
            onGenerate={() => void handleGenerate()}
            onStop={handleStop}
          />
        </div>

        <div className="lg:col-span-7 lg:sticky lg:top-22">
          <OutputPanel
            selectedArtifacts={selectedArtifacts}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            outputs={outputs}
            apiTitle={parsedSummary?.title || 'api-client'}
          />
        </div>
      </div>
    </div>
  );
};
