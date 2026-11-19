import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseAndValidateOpenApi } from './server/parse-spec.ts';
import { buildArtifactPrompt } from './server/prompts.ts';
import {
  getAvailableProviders,
  listProviderModels,
  streamProviderCompletion,
} from './server/providers.ts';
import type { ArtifactType, GenerationOptions, ProviderId } from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID_ARTIFACTS = new Set<ArtifactType>([
  'sdk',
  'docs',
  'tests',
  'postman',
  'examples',
]);

const VALID_PROVIDERS = new Set<ProviderId>(['gemini', 'openai', 'anthropic']);

async function createApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // List providers, model presets, and whether optional server fallback keys exist
  app.get('/api/providers', (_req, res) => {
    res.json({ providers: getAvailableProviders() });
  });

  // Fetch live models using the user's API key (or server fallback key)
  app.post('/api/models', async (req, res) => {
    try {
      const { provider } = req.body as { provider?: ProviderId };
      const chosenProvider: ProviderId =
        provider && VALID_PROVIDERS.has(provider) ? provider : 'gemini';
      const headerKey = req.header('x-provider-api-key');
      const models = await listProviderModels(chosenProvider, headerKey);
      res.json({ models });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load models.';
      res.status(400).json({ error: message });
    }
  });

  // Validate & parse OpenAPI 3.x (JSON or YAML)
  app.post('/api/parse-spec', async (req, res) => {
    try {
      const { spec } = req.body as { spec?: string };
      if (typeof spec !== 'string') {
        res.status(400).json({ error: 'Request body must include a string "spec" field.' });
        return;
      }
      const summary = await parseAndValidateOpenApi(spec);
      res.json(summary);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse OpenAPI specification.';
      res.status(400).json({ error: message });
    }
  });

  // Fetch an OpenAPI spec from a remote URL server-side
  app.post('/api/fetch-spec-url', async (req, res) => {
    try {
      const { url } = req.body as { url?: string };
      if (typeof url !== 'string' || !url.trim()) {
        res.status(400).json({ error: 'Please provide a valid http(s) URL.' });
        return;
      }
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url.trim());
      } catch {
        res.status(400).json({ error: 'Invalid URL format.' });
        return;
      }
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        res.status(400).json({ error: 'Only http:// and https:// URLs are supported.' });
        return;
      }
      const hostname = parsedUrl.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        hostname.endsWith('.local')
      ) {
        res.status(400).json({ error: 'Local and private network URLs cannot be fetched.' });
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const resp = await fetch(parsedUrl.toString(), {
          signal: controller.signal,
          headers: { Accept: 'application/json, application/yaml, text/yaml, text/plain' },
        });
        if (!resp.ok) {
          res.status(502).json({ error: `Remote server returned HTTP ${resp.status}.` });
          return;
        }
        const text = await resp.text();
        if (text.length > 1_500_000) {
          res.status(413).json({ error: 'Remote OpenAPI document exceeds 1.5 MB limit.' });
          return;
        }
        const summary = await parseAndValidateOpenApi(text);
        res.json({ spec: text, summary });
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch and validate remote specification.';
      res.status(400).json({ error: message });
    }
  });

  // Streaming artifact generation endpoint (SSE)
  app.post('/api/generate', async (req, res) => {
    const { spec, artifact, provider, model, options } = req.body as {
      spec?: string;
      artifact?: ArtifactType;
      provider?: ProviderId;
      model?: string;
      options?: Partial<GenerationOptions>;
    };

    const userApiKey = req.header('x-provider-api-key');

    if (typeof spec !== 'string' || !spec.trim()) {
      res.status(400).json({ error: 'Missing OpenAPI specification.' });
      return;
    }
    if (!artifact || !VALID_ARTIFACTS.has(artifact)) {
      res.status(400).json({ error: 'Invalid artifact type requested.' });
      return;
    }
    const chosenProvider: ProviderId =
      provider && VALID_PROVIDERS.has(provider) ? provider : 'gemini';

    let summary;
    try {
      summary = await parseAndValidateOpenApi(spec);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid OpenAPI specification.';
      res.status(400).json({ error: message });
      return;
    }

    const genOptions: GenerationOptions = {
      sdkStyle: options?.sdkStyle === 'axios' ? 'axios' : 'fetch',
      testFramework: options?.testFramework === 'jest' ? 'jest' : 'vitest',
    };

    const { systemInstruction, prompt } = buildArtifactPrompt(artifact, summary, genOptions);

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
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`SpecForge server listening on http://localhost:${port}`);
  });
}

createApp().catch((err) => {
  console.error('Failed to start SpecForge server:', err);
  process.exit(1);
});
