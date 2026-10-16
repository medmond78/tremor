import { logger } from '../lib/logger';

export type AIProvider = 'gemini' | 'claude';

export interface GenerateTextOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateTextResult {
  content: string;
  provider: AIProvider;
  model: string;
  citations?: string[];
  sourcesUsed?: number;
}

/**
 * Determine the active AI provider and key from environment variables.
 * Limited to Gemini and Claude.
 */
export function getActiveAIConfig(): {
  provider: AIProvider;
  apiKey: string;
  model: string;
} | null {
  const preferredProvider = process.env.AI_PROVIDER?.toLowerCase() as
    | AIProvider
    | undefined;

  const geminiKey = process.env.GEMINI_API_KEY;
  const claudeKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;

  if (preferredProvider === 'gemini' && geminiKey) {
    return {
      provider: 'gemini',
      apiKey: geminiKey,
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    };
  }

  if (preferredProvider === 'claude' && claudeKey) {
    return {
      provider: 'claude',
      apiKey: claudeKey,
      model: process.env.CLAUDE_MODEL || 'claude-3-7-sonnet-latest',
    };
  }

  // Auto-detection: prioritize Gemini if key exists, then Claude
  if (geminiKey) {
    return {
      provider: 'gemini',
      apiKey: geminiKey,
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    };
  }

  if (claudeKey) {
    return {
      provider: 'claude',
      apiKey: claudeKey,
      model: process.env.CLAUDE_MODEL || 'claude-3-7-sonnet-latest',
    };
  }

  return null;
}

/**
 * Generate text using either Google Gemini or Anthropic Claude.
 */
export async function generateAIText(
  options: GenerateTextOptions
): Promise<GenerateTextResult> {
  const config = getActiveAIConfig();
  if (!config) {
    throw new Error(
      'No AI provider configured. Please set GEMINI_API_KEY or ANTHROPIC_API_KEY.'
    );
  }

  const { provider, apiKey, model } = config;
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? 500;

  if (provider === 'gemini') {
    return await callGemini(apiKey, model, options.prompt, {
      systemPrompt: options.systemPrompt,
      temperature,
      maxTokens,
    });
  } else {
    return await callClaude(apiKey, model, options.prompt, {
      systemPrompt: options.systemPrompt,
      temperature,
      maxTokens,
    });
  }
}

/**
 * Google Gemini API Implementation
 */
async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
  opts: {
    systemPrompt?: string;
    temperature: number;
    maxTokens: number;
  }
): Promise<GenerateTextResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${apiKey}`;

  const contents: Array<{ role?: string; parts: Array<{ text: string }> }> = [];

  if (opts.systemPrompt) {
    contents.push({
      role: 'user',
      parts: [{ text: `System instruction: ${opts.systemPrompt}` }],
    });
  }

  contents.push({
    role: 'user',
    parts: [{ text: prompt }],
  });

  const requestBody: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: opts.temperature,
      maxOutputTokens: opts.maxTokens,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(`Gemini API error (${response.status}):`, errorText);
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  const content = parts
    .map((p: { text?: string }) => p.text || '')
    .join('')
    .trim();

  // Extract grounding citations if available
  const citations: string[] = [];
  const groundingChunks = candidate?.groundingMetadata?.groundingChunks || [];
  for (const chunk of groundingChunks) {
    if (chunk.web?.uri) {
      citations.push(chunk.web.uri);
    }
  }

  return {
    content,
    provider: 'gemini',
    model,
    citations: citations.length > 0 ? citations : undefined,
    sourcesUsed: citations.length,
  };
}

/**
 * Anthropic Claude API Implementation
 */
async function callClaude(
  apiKey: string,
  model: string,
  prompt: string,
  opts: {
    systemPrompt?: string;
    temperature: number;
    maxTokens: number;
  }
): Promise<GenerateTextResult> {
  const url = 'https://api.anthropic.com/v1/messages';

  const requestBody: Record<string, unknown> = {
    model,
    max_tokens: opts.maxTokens,
    temperature: opts.temperature,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  };

  if (opts.systemPrompt) {
    requestBody.system = opts.systemPrompt;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(`Claude API error (${response.status}):`, errorText);
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const contentBlocks = data.content || [];
  const content = contentBlocks
    .filter((b: { type?: string }) => b.type === 'text')
    .map((b: { text?: string }) => b.text || '')
    .join('')
    .trim();

  return {
    content,
    provider: 'claude',
    model,
    citations: [],
    sourcesUsed: 0,
  };
}
