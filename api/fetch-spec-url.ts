import { parseAndValidateOpenApi } from '../server/parse-spec.ts';
import {
  readJsonBody,
  sendJson,
  type ServerlessRequest,
  type ServerlessResponse,
} from './_helpers.ts';

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }

  try {
    const { url } = await readJsonBody<{ url?: string }>(req);
    if (typeof url !== 'string' || !url.trim()) {
      sendJson(res, 400, { error: 'Please provide a valid http(s) URL.' });
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.trim());
    } catch {
      sendJson(res, 400, { error: 'Invalid URL format.' });
      return;
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      sendJson(res, 400, { error: 'Only http:// and https:// URLs are supported.' });
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
      sendJson(res, 400, { error: 'Local and private network URLs cannot be fetched.' });
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
        sendJson(res, 502, { error: `Remote server returned HTTP ${resp.status}.` });
        return;
      }
      const text = await resp.text();
      if (text.length > 1_500_000) {
        sendJson(res, 413, { error: 'Remote OpenAPI document exceeds 1.5 MB limit.' });
        return;
      }
      const summary = await parseAndValidateOpenApi(text);
      sendJson(res, 200, { spec: text, summary });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to fetch and validate remote specification.';
    sendJson(res, 400, { error: message });
  }
}
