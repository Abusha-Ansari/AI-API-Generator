import { parseAndValidateOpenApi } from '../server/parse-spec.ts';
import { buildArtifactPrompt } from '../server/prompts.ts';
import { streamProviderCompletion } from '../server/providers.ts';
import type { ArtifactType, GenerationOptions, ProviderId } from '../src/types/index.ts';
import {
  getHeaderValue,
  readJsonBody,
  sendJson,
  type ServerlessRequest,
  type ServerlessResponse,
} from './_helpers.ts';

const VALID_ARTIFACTS = new Set<ArtifactType>([
  'sdk',
  'docs',
  'tests',
  'postman',
  'examples',
]);

const VALID_PROVIDERS = new Set<ProviderId>(['gemini', 'openai', 'anthropic']);

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }

  let body: {
    spec?: string;
    artifact?: ArtifactType;
    provider?: ProviderId;
    model?: string;
    options?: Partial<GenerationOptions>;
  };

  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON request body.' });
    return;
  }

  const { spec, artifact, provider, model, options } = body;
  const userApiKey = getHeaderValue(req, 'x-provider-api-key');

  if (typeof spec !== 'string' || !spec.trim()) {
    sendJson(res, 400, { error: 'Missing OpenAPI specification.' });
    return;
  }
  if (!artifact || !VALID_ARTIFACTS.has(artifact)) {
    sendJson(res, 400, { error: 'Invalid artifact type requested.' });
    return;
  }

  const chosenProvider: ProviderId =
    provider && VALID_PROVIDERS.has(provider) ? provider : 'gemini';

  let summary;
  try {
    summary = await parseAndValidateOpenApi(spec);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid OpenAPI specification.';
    sendJson(res, 400, { error: message });
    return;
  }

  const genOptions: GenerationOptions = {
    sdkStyle: options?.sdkStyle === 'axios' ? 'axios' : 'fetch',
    testFramework: options?.testFramework === 'jest' ? 'jest' : 'vitest',
  };

  const { systemInstruction, prompt } = buildArtifactPrompt(artifact, summary, genOptions);

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const abortController = new AbortController();
  req.on('close', () => {
    abortController.abort();
  });

  const sendEvent = (eventName: string, payload: unknown) => {
    if (res.writableEnded) return;
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  try {
    await streamProviderCompletion({
      provider: chosenProvider,
      model,
      apiKey: userApiKey,
      systemInstruction,
      prompt,
      signal: abortController.signal,
      onChunk: (chunk) => {
        sendEvent('chunk', { text: chunk });
      },
    });
    if (!abortController.signal.aborted) {
      sendEvent('done', { artifact });
    }
  } catch (err) {
    if (!abortController.signal.aborted) {
      const message = err instanceof Error ? err.message : 'Generation stream failed.';
      sendEvent('error', { error: message });
    }
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
}
