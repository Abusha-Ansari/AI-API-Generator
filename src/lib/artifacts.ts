import type { ArtifactType } from '../types/index.ts';

export interface ArtifactMeta {
  id: ArtifactType;
  label: string;
  shortLabel: string;
  description: string;
  extension: string;
  language: 'typescript' | 'markdown' | 'json';
  defaultFileSuffix: string;
}

export const ARTIFACT_ORDER: ArtifactType[] = [
  'sdk',
  'docs',
  'tests',
  'postman',
  'examples',
];

export const ARTIFACT_META: Record<ArtifactType, ArtifactMeta> = {
  sdk: {
    id: 'sdk',
    label: 'TypeScript SDK',
    shortLabel: 'TS SDK',
    description: 'Typed client class with exported interfaces and one async method per endpoint.',
    extension: 'ts',
    language: 'typescript',
    defaultFileSuffix: '-sdk.ts',
  },
  docs: {
    id: 'docs',
    label: 'API Documentation',
    shortLabel: 'API Docs',
    description: 'Markdown reference covering auth, parameters, payload schemas, and responses.',
    extension: 'md',
    language: 'markdown',
    defaultFileSuffix: '-docs.md',
  },
  tests: {
    id: 'tests',
    label: 'Unit Tests',
    shortLabel: 'Unit Tests',
    description: 'Mocked Vitest or Jest suite with success and error assertions per endpoint.',
    extension: 'test.ts',
    language: 'typescript',
    defaultFileSuffix: '.test.ts',
  },
  postman: {
    id: 'postman',
    label: 'Postman Collection',
    shortLabel: 'Postman JSON',
    description: 'Valid Postman Collection v2.1.0 JSON organized by tags with variables.',
    extension: 'postman_collection.json',
    language: 'json',
    defaultFileSuffix: '.postman_collection.json',
  },
  examples: {
    id: 'examples',
    label: 'Request Examples',
    shortLabel: 'Examples',
    description: 'Runnable cURL commands and JavaScript fetch snippets for every endpoint.',
    extension: 'examples.md',
    language: 'markdown',
    defaultFileSuffix: '-examples.md',
  },
};

export function slugifyApiTitle(title: string): string {
  const cleaned = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'api-client';
}

export function getArtifactFilename(apiTitle: string, artifact: ArtifactType): string {
  const slug = slugifyApiTitle(apiTitle);
  return `${slug}${ARTIFACT_META[artifact].defaultFileSuffix}`;
}

/**
 * Strips leading/trailing markdown code fences when saving or copying pure code/JSON artifacts.
 */
export function extractDownloadableContent(raw: string, artifact: ArtifactType): string {
  const trimmed = raw.trim();
  if (artifact === 'docs' || artifact === 'examples') {
    return trimmed;
  }
  const fenceMatch = trimmed.match(/^```(?:[a-zA-Z0-9_-]+)?\r?\n([\s\S]*?)\r?\n```$/);
  if (fenceMatch) {
    return fenceMatch[1].trim() + '\n';
  }
  // Handle partial/unclosed leading fence during or right after stream
  const openFenceMatch = trimmed.match(/^```(?:[a-zA-Z0-9_-]+)?\r?\n([\s\S]*)$/);
  if (openFenceMatch) {
    return openFenceMatch[1].replace(/\r?\n```\s*$/, '').trim() + '\n';
  }
  return trimmed + '\n';
}
