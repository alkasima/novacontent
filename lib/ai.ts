import { supabase } from './supabase';

export type ProviderType = 'anthropic' | 'openai' | 'gemini' | 'openrouter' | 'custom';

export interface AIProvider {
  id: string;
  provider: ProviderType;
  label?: string | null;
  model: string;
  api_key: string;
  base_url?: string | null;
  is_default: boolean;
  is_active: boolean;
}

export async function getDefaultProvider(): Promise<AIProvider | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('ai_providers')
    .select('*')
    .eq('is_default', true)
    .eq('is_active', true)
    .maybeSingle();
  return (data as AIProvider) || null;
}

interface ChatOptions {
  system?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
}

/**
 * Calls the given provider with a single system+user turn and returns the
 * assistant text. Throws on transport / API errors.
 */
export async function chat(provider: AIProvider, opts: ChatOptions): Promise<string> {
  const { provider: type } = provider;

  if (type === 'anthropic') return chatAnthropic(provider, opts);
  if (type === 'gemini') return chatGemini(provider, opts);
  // openai, openrouter, and custom are all OpenAI-compatible
  return chatOpenAICompatible(provider, opts);
}

function baseUrlFor(provider: AIProvider): string {
  switch (provider.provider) {
    case 'openai':
      return 'https://api.openai.com/v1';
    case 'openrouter':
      return 'https://openrouter.ai/api/v1';
    case 'custom':
      if (!provider.base_url) throw new Error('Custom provider requires a base URL');
      return provider.base_url.replace(/\/+$/, '');
    default:
      return 'https://api.openai.com/v1';
  }
}

async function chatOpenAICompatible(provider: AIProvider, opts: ChatOptions): Promise<string> {
  const messages: { role: string; content: string }[] = [];
  if (opts.system) messages.push({ role: 'system', content: opts.system });
  messages.push({ role: 'user', content: opts.prompt });

  const body: Record<string, unknown> = {
    model: provider.model,
    messages,
    temperature: opts.temperature ?? 0.8,
    max_tokens: opts.maxTokens ?? 1200,
  };
  if (opts.json) body.response_format = { type: 'json_object' };

  const res = await fetch(baseUrlFor(provider) + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + provider.api_key,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const details = err?.error?.message ? ` — ${err.error.message}` : '';
    throw new Error(`${provider.label || provider.provider} (${provider.model}): HTTP ${res.status}${details}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || '';
}

async function chatAnthropic(provider: AIProvider, opts: ChatOptions): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': provider.api_key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: provider.model,
      max_tokens: opts.maxTokens ?? 1200,
      temperature: opts.temperature ?? 0.8,
      ...(opts.system ? { system: opts.system } : {}),
      messages: [{ role: 'user', content: opts.prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const details = err?.error?.message ? ` — ${err.error.message}` : '';
    throw new Error(`${provider.label || provider.provider} (${provider.model}): HTTP ${res.status}${details}`);
  }
  const data = await res.json();
  const text = Array.isArray(data?.content)
    ? data.content.map((c: { text?: string }) => c.text || '').join('').trim()
    : '';
  return text;
}

async function chatGemini(provider: AIProvider, opts: ChatOptions): Promise<string> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(provider.model)}:generateContent?key=` +
    encodeURIComponent(provider.api_key);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
      contents: [{ role: 'user', parts: [{ text: opts.prompt }] }],
      generationConfig: {
        temperature: opts.temperature ?? 0.8,
        maxOutputTokens: opts.maxTokens ?? 1200,
        ...(opts.json ? { responseMimeType: 'application/json' } : {}),
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const details = err?.error?.message ? ` — ${err.error.message}` : '';
    throw new Error(`${provider.label || provider.provider} (${provider.model}): HTTP ${res.status}${details}`);
  }
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  return Array.isArray(parts) ? parts.map((p: { text?: string }) => p.text || '').join('').trim() : '';
}
