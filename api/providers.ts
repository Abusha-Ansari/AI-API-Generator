import { getAvailableProviders } from '../server/providers.ts';
import { sendJson, type ServerlessRequest, type ServerlessResponse } from './_helpers.ts';

export default function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }
  sendJson(res, 200, { providers: getAvailableProviders() });
}
