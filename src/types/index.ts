export type ArtifactType = 'sdk' | 'docs' | 'tests' | 'postman' | 'examples';

export type ProviderId = 'gemini' | 'openai' | 'anthropic';

export interface ProviderModelPreset {
  id: string;
  label: string;
}

export interface ProviderOption {
  id: ProviderId;
  label: string;
  vendor: 'Google Gemini' | 'OpenAI' | 'Anthropic';
  defaultModel: string;
  presetModels: ProviderModelPreset[];
  hasServerFallbackKey: boolean;
  keyPlaceholder: string;
}

export interface EndpointSummary {
  method: string;
  path: string;
  summary: string;
  operationId: string;
  tags: string[];
  parametersCount: number;
  hasRequestBody: boolean;
}

export interface TagCount {
  name: string;
  count: number;
}

export interface ParsedSpecSummary {
  title: string;
  version: string;
  specVersion: string;
  description: string;
  baseUrl: string;
  format: 'json' | 'yaml';
  endpointCount: number;
  tagCount: number;
  schemaCount: number;
  tags: TagCount[];
  endpoints: EndpointSummary[];
  normalizedSpec: string;
}

export interface GenerationOptions {
  sdkStyle: 'fetch' | 'axios';
  testFramework: 'vitest' | 'jest';
}

export type ArtifactStreamStatus = 'idle' | 'streaming' | 'complete' | 'error';

export interface ArtifactOutputState {
  status: ArtifactStreamStatus;
  content: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface HistoryEntry {
  id: string;
  createdAt: number;
  specTitle: string;
  specVersion: string;
  endpointCount: number;
  provider: ProviderId;
  model: string;
  artifacts: ArtifactType[];
  specRaw: string;
  outputs: Partial<Record<ArtifactType, string>>;
}
