import { listProviderModels } from '../server/providers.ts';
import type { ProviderId } from '../src/types/index.ts';
import {
  getHeaderValue,
  readJsonBody,
  sendJson,
  type ServerlessRequest,
  type ServerlessResponse,
} from './_helpers.ts';

const VALID_PROVIDERS = new Set<ProviderId>(['gemini', 'openai', 'anthropic']);

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }

  try {
    const { provider } = await readJsonBody<{ provider?: ProviderId }>(req);
    const chosenProvider: ProviderId =
      provider && VALID_PROVIDERS.has(provider) ? provider : 'gemini';
    const headerKey = getHeaderValue(req, 'x-provider-api-key');
    const models = await listProviderModels(chosenProvider, headerKey);
    sendJson(res, 200, { models });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load models.';
    sendJson(res, 400, { error: message });
  }
}
