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
    const { spec } = await readJsonBody<{ spec?: string }>(req);
    if (typeof spec !== 'string') {
      sendJson(res, 400, { error: 'Request body must include a string "spec" field.' });
      return;
    }
    const summary = await parseAndValidateOpenApi(spec);
    sendJson(res, 200, summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to parse OpenAPI specification.';
    sendJson(res, 400, { error: message });
  }
}
