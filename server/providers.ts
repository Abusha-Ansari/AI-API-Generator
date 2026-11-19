import { GoogleGenAI } from '@google/genai';
import type { ProviderId, ProviderModelPreset, ProviderOption } from '../src/types/index.ts';

export function getAvailableProviders(): ProviderOption[] {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim());
  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY?.trim());
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY?.trim());

  return [
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
      hasServerFallbackKey: hasGemini,
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
      hasServerFallbackKey: hasOpenAi,
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
      hasServerFallbackKey: hasAnthropic,
      keyPlaceholder: 'sk-ant-...',
    },
  ];
}

function resolveApiKey(provider: ProviderId, userApiKey?: string): string {
  const trimmedUserKey = userApiKey?.trim();
  if (trimmedUserKey) {
    return trimmedUserKey;
  }

  if (provider === 'gemini') {
    const serverKey = process.env.GEMINI_API_KEY?.trim();
    if (serverKey) return serverKey;
    throw new Error('Please enter your Google Gemini API key to generate artifacts.');
  }

  if (provider === 'openai') {
    const serverKey = process.env.OPENAI_API_KEY?.trim();
    if (serverKey) return serverKey;
    throw new Error('Please enter your OpenAI API key to generate artifacts.');
  }

  if (provider === 'anthropic') {
    const serverKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (serverKey) return serverKey;
    throw new Error('Please enter your Anthropic API key to generate artifacts.');
  }

  throw new Error(`Unsupported provider: ${String(provider)}`);
}

function createGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function listProviderModels(
  provider: ProviderId,
  userApiKey?: string,
): Promise<ProviderModelPreset[]> {
  const apiKey = resolveApiKey(provider, userApiKey);

  if (provider === 'gemini') {
    const ai = createGeminiClient(apiKey);
    const pager = await ai.models.list({ config: { pageSize: 50 } });
    const models: ProviderModelPreset[] = [];
    for await (const m of pager) {
      const rawName = m.name || '';
      const id = rawName.replace(/^models\//, '');
      if (!id || !id.includes('gemini')) continue;
      if (/embedding|aqa|imagen|veo|lyria|tts|transcribe|live/i.test(id)) continue;
      models.push({
        id,
        label: m.displayName ? `${m.displayName} (${id})` : id,
      });
    }
    if (models.length === 0) {
      return getAvailableProviders().find((p) => p.id === 'gemini')?.presetModels || [];
    }
    return models;
  }

  if (provider === 'openai') {
    const resp = await fetch('https://api.openai.com/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => resp.statusText);
      throw new Error(`OpenAI models request failed (${resp.status}): ${errText}`);
    }
    const payload = (await resp.json()) as { data?: Array<{ id: string }> };
    const filtered = (payload.data || [])
      .map((m) => m.id)
      .filter((id) => /^(gpt-|o1|o3|o4|chatgpt-)/i.test(id))
      .sort()
      .map((id) => ({ id, label: id }));
    return filtered.length > 0
      ? filtered
      : getAvailableProviders().find((p) => p.id === 'openai')?.presetModels || [];
  }

  if (provider === 'anthropic') {
    const resp = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => resp.statusText);
      throw new Error(`Anthropic models request failed (${resp.status}): ${errText}`);
    }
    const payload = (await resp.json()) as {
      data?: Array<{ id: string; display_name?: string }>;
    };
    const items = (payload.data || []).map((m) => ({
      id: m.id,
      label: m.display_name ? `${m.display_name} (${m.id})` : m.id,
    }));
    return items.length > 0
      ? items
      : getAvailableProviders().find((p) => p.id === 'anthropic')?.presetModels || [];
  }

  return [];
}

export async function streamProviderCompletion(params: {
  provider: ProviderId;
  model?: string;
  apiKey?: string;
  systemInstruction: string;
  prompt: string;
  signal: AbortSignal;
  onChunk: (text: string) => void;
}): Promise<void> {
  const { provider, model, apiKey: userApiKey, systemInstruction, prompt, signal, onChunk } = params;
  const apiKey = resolveApiKey(provider, userApiKey);

  if (provider === 'gemini') {
    const ai = createGeminiClient(apiKey);
    const modelName = model?.trim() || 'gemini-4-hydrogen';

    const responseStream = await ai.models.generateContentStream({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

    for await (const chunk of responseStream) {
      if (signal.aborted) {
        return;
      }
      if (chunk.text) {
        onChunk(chunk.text);
      }
    }
    return;
  }

  if (provider === 'openai') {
    const modelName = model?.trim() || 'gpt-4o-mini';
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        stream: true,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt },
        ],
      }),
      signal,
    });

    if (!resp.ok || !resp.body) {
      const errText = await resp.text().catch(() => resp.statusText);
      throw new Error(`OpenAI API error (${resp.status}): ${errText}`);
    }

    await readSseLines(resp.body, (data) => {
      if (data === '[DONE]') return;
      const parsed = JSON.parse(data) as {
        choices?: Array<{ delta?: { content?: string } }>;
      };
      const delta = parsed.choices?.[0]?.delta?.content;
      if (delta) onChunk(delta);
    });
    return;
  }

  if (provider === 'anthropic') {
    const modelName = model?.trim() || 'claude-3-5-haiku-latest';
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 4096,
        stream: true,
        system: systemInstruction,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal,
    });

    if (!resp.ok || !resp.body) {
      const errText = await resp.text().catch(() => resp.statusText);
      throw new Error(`Anthropic API error (${resp.status}): ${errText}`);
    }

    await readSseLines(resp.body, (data) => {
      const parsed = JSON.parse(data) as {
        type?: string;
        delta?: { type?: string; text?: string };
      };
      if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
        onChunk(parsed.delta.text);
      }
    });
    return;
  }

  throw new Error(`Unsupported provider: ${String(provider)}`);
}

async function readSseLines(
  body: ReadableStream<Uint8Array>,
  onData: (data: string) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data) continue;
      try {
        onData(data);
      } catch {
        // Ignore non-JSON keepalive lines
      }
    }
  }
}
