import SwaggerParser from '@apidevtools/swagger-parser';
import * as yaml from 'js-yaml';
import type { EndpointSummary, ParsedSpecSummary, TagCount } from '../src/types/index.ts';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'] as const;

interface RawOpenApiObject {
  openapi?: string;
  swagger?: string;
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
  servers?: Array<{ url?: string; description?: string }>;
  host?: string;
  basePath?: string;
  schemes?: string[];
  tags?: Array<{ name?: string; description?: string }>;
  paths?: Record<string, Record<string, unknown>>;
  components?: {
    schemas?: Record<string, unknown>;
  };
  definitions?: Record<string, unknown>;
}

export function parseRawSpecText(rawText: string): {
  parsed: RawOpenApiObject;
  format: 'json' | 'yaml';
} {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error('Specification input is empty. Paste an OpenAPI 3.x JSON or YAML document.');
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as RawOpenApiObject;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('OpenAPI specification root must be a JSON object.');
      }
      return { parsed, format: 'json' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON syntax';
      throw new Error(`JSON parse error: ${msg}`);
    }
  }

  try {
    const parsed = yaml.load(trimmed) as RawOpenApiObject;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('OpenAPI specification root must be a YAML mapping.');
    }
    return { parsed, format: 'yaml' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid YAML syntax';
    throw new Error(`YAML parse error: ${msg}`);
  }
}

export async function parseAndValidateOpenApi(rawText: string): Promise<ParsedSpecSummary> {
  const { parsed, format } = parseRawSpecText(rawText);

  const specVersion = parsed.openapi || parsed.swagger;
  if (!specVersion) {
    throw new Error('Missing "openapi" (e.g. "3.0.3" or "3.1.0") or "swagger" version field.');
  }

  if (!parsed.info?.title) {
    throw new Error('Missing required "info.title" field in OpenAPI specification.');
  }

  if (!parsed.paths || typeof parsed.paths !== 'object') {
    throw new Error('Missing required "paths" object in OpenAPI specification.');
  }

  let dereferenced: RawOpenApiObject;
  const cloneForParser = structuredClone(parsed);

  if (typeof parsed.openapi === 'string' && parsed.openapi.startsWith('3.1')) {
    // SwaggerParser.validate targets OpenAPI 2.0/3.0 schemas strictly; dereference 3.1 cleanly.
    dereferenced = (await SwaggerParser.dereference(
      cloneForParser as Parameters<typeof SwaggerParser.dereference>[0],
    )) as unknown as RawOpenApiObject;
  } else {
    dereferenced = (await SwaggerParser.validate(
      cloneForParser as Parameters<typeof SwaggerParser.validate>[0],
    )) as unknown as RawOpenApiObject;
  }

  const endpoints: EndpointSummary[] = [];
  const tagMap = new Map<string, number>();

  for (const [pathKey, pathItem] of Object.entries(dereferenced.paths || {})) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    const pathLevelParams = Array.isArray((pathItem as Record<string, unknown>).parameters)
      ? ((pathItem as Record<string, unknown>).parameters as unknown[])
      : [];

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method] as Record<string, unknown> | undefined;
      if (!operation || typeof operation !== 'object') continue;

      const opTags = Array.isArray(operation.tags) && operation.tags.length > 0
        ? operation.tags.map((t) => String(t))
        : ['Default'];

      for (const tagName of opTags) {
        tagMap.set(tagName, (tagMap.get(tagName) || 0) + 1);
      }

      const opParams = Array.isArray(operation.parameters) ? operation.parameters : [];
      const combinedParams = pathLevelParams.length + opParams.length;
      const summaryText =
        typeof operation.summary === 'string' && operation.summary.trim()
          ? operation.summary.trim()
          : typeof operation.description === 'string'
            ? operation.description.trim().slice(0, 80)
            : `${method.toUpperCase()} ${pathKey}`;

      const operationId =
        typeof operation.operationId === 'string' && operation.operationId.trim()
          ? operation.operationId.trim()
          : `${method}${pathKey.replace(/[^a-zA-Z0-9]+/g, '_')}`;

      endpoints.push({
        method: method.toUpperCase(),
        path: pathKey,
        summary: summaryText,
        operationId,
        tags: opTags,
        parametersCount: combinedParams,
        hasRequestBody: Boolean(operation.requestBody),
      });
    }
  }

  if (endpoints.length === 0) {
    throw new Error('Specification parsed, but no HTTP operations were found under "paths".');
  }

  const tags: TagCount[] = Array.from(tagMap.entries()).map(([name, count]) => ({
    name,
    count,
  }));

  let baseUrl = 'https://api.example.com';
  if (Array.isArray(dereferenced.servers) && dereferenced.servers[0]?.url) {
    baseUrl = dereferenced.servers[0].url;
  } else if (dereferenced.host) {
    const scheme = dereferenced.schemes?.[0] || 'https';
    baseUrl = `${scheme}://${dereferenced.host}${dereferenced.basePath || ''}`;
  }

  const schemaCount = Object.keys(
    dereferenced.components?.schemas || dereferenced.definitions || {},
  ).length;

  // Compact JSON representation of the dereferenced spec for clean LLM context
  const normalizedSpec = JSON.stringify(dereferenced, null, 2);

  return {
    title: dereferenced.info?.title || 'Untitled API',
    version: dereferenced.info?.version || '1.0.0',
    specVersion,
    description: dereferenced.info?.description || '',
    baseUrl,
    format,
    endpointCount: endpoints.length,
    tagCount: tags.length,
    schemaCount,
    tags,
    endpoints,
    normalizedSpec,
  };
}
