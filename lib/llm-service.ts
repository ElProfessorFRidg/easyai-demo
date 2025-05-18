import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { CohereClient } from 'cohere-ai';
import { AIProvider } from './ai-providers';

// Interfaces for consistent request/response structure (can be expanded)
interface LLMRequest {
  prompt: string;
  provider: AIProvider;
  apiKey: string;
  model?: string; // Optional model override
  maxTokens?: number;
  temperature?: number;
  // Add other common parameters like system prompt, conversation history, etc.
}

interface LLMResponse {
  content: string;
  provider: AIProvider;
  modelUsed?: string;
  error?: string;
}

// Initialize clients (consider lazy initialization or per-request if preferred)
// For server-side usage, API keys are passed per request.
// If you had global keys, you'd initialize them here using process.env.

const getOpenAIClient = (apiKey: string) => new OpenAI({ apiKey });
const getAnthropicClient = (apiKey: string) => new Anthropic({ apiKey });
const getCohereClient = (apiKey: string) => new CohereClient({ token: apiKey });

export async function getLLMCompletion(request: LLMRequest): Promise<LLMResponse> {
  const { prompt, provider, apiKey, model, maxTokens = 1000, temperature = 0.7 } = request;

  try {
    switch (provider) {
      case AIProvider.OpenAI:
        const openai = getOpenAIClient(apiKey);
        const openaiResponse = await openai.chat.completions.create({
          model: model || 'gpt-3.5-turbo', // Default model for OpenAI
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature: temperature,
        });
        return {
          content: openaiResponse.choices[0]?.message?.content || '',
          provider,
          modelUsed: openaiResponse.model,
        };

      case AIProvider.Anthropic:
        const anthropic = getAnthropicClient(apiKey);
        const anthropicResponse = await anthropic.messages.create({
          model: model || 'claude-2.1', // Default model for Anthropic
          max_tokens: maxTokens,
          temperature: temperature,
          messages: [{ role: 'user', content: prompt }],
        });
        return {
          content: anthropicResponse.content[0]?.type === 'text' ? anthropicResponse.content[0].text : '',
          provider,
          modelUsed: anthropicResponse.model,
        };

      case AIProvider.Cohere:
        const cohere = getCohereClient(apiKey);
        const cohereResponse = await cohere.chat({
          model: model || 'command-r', // Default model for Cohere
          message: prompt,
          maxTokens: maxTokens,
          temperature: temperature,
          // Cohere's chat API might have a slightly different structure for conversation history
        });
        return {
          content: cohereResponse.text || '',
          provider,
          modelUsed: model || 'command-r', // Cohere's response might not explicitly state the model in the same way
        };

      default:
        console.error(`Unsupported AI provider: ${provider}`);
        return {
          content: '',
          provider,
          error: `Unsupported AI provider: ${provider}`,
        };
    }
  } catch (error: any) {
    console.error(`Error calling AI provider ${provider}:`, error);
    return {
      content: '',
      provider,
      error: error.message || 'An unknown error occurred with the AI provider.',
      modelUsed: model,
    };
  }
}