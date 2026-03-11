import { CLOUDFLARE_API_KEY, GLM_WORKER_URL } from '@/lib/env';

/**
 * Basic Message structure for GLM-4.7-Flash.
 */
export interface GLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool' | 'developer';
  content: string | unknown[];
  name?: string;
  tool_calls?: unknown[];
  tool_call_id?: string;
}

/**
 * Options for text generation.
 */
export interface GenerateTextOptions {
  messages: GLMMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: unknown[];
  tool_choice?: 'none' | 'auto' | 'required';
  response_format?: {
    type: 'json_schema';
    json_schema: {
      name: string;
      strict: boolean;
      schema: unknown;
    };
  };
}

/**
 * The standard response structure from the GLM worker.
 */
export interface GenerateTextResult {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: 'assistant';
      content: string;
      tool_calls?: unknown[];
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Core function to generate text using the GLM-4.7-Flash model.
 * Does not use any external SDKs, matching the provided worker documentation.
 */
export async function generateText(options: GenerateTextOptions): Promise<{ text: string }> {
  if (!GLM_WORKER_URL) {
    throw new Error('GLM_WORKER_URL is missing in environment variables');
  }

  if (!CLOUDFLARE_API_KEY) {
    throw new Error('CLOUDFLARE_API_KEY (API_KEY) is missing in environment variables');
  }

  try {
    const response = await fetch(GLM_WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CLOUDFLARE_API_KEY}`,
      },
      body: JSON.stringify({
        ...options,
        stream: false, // Ensure we get a direct JSON response for this simplified helper.
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GLM_GENERATE_TEXT] API Error: ${response.status} - ${errorText}`);
      throw new Error(`Text generation failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as GenerateTextResult;
    const text = data.choices[0]?.message?.content || '';

    return { text };
  } catch (error) {
    console.error('[GENERATE_TEXT_EXCEPTION]', error);
    throw error;
  }
}
