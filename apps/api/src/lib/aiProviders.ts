import Groq from 'groq-sdk';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from './logger';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: any[];
}

/**
 * Main entry point for chat with fallback and agentic loop.
 */
export async function chatWithFallback(
  messages: ChatMessage[],
  tools: any[],
  toolCallHandler: (name: string, args: any) => Promise<any>
) {
  const providers = [
    { name: 'groq', fn: groqChat },
    { name: 'openrouter', fn: openrouterChat },
    { name: 'gemini', fn: geminiChat },
    { name: 'mistral', fn: mistralChat },
    { name: 'cohere', fn: cohereChat },
    { name: 'cerebras', fn: cerebrasChat }
  ];

  let lastError: any = null;

  for (const provider of providers) {
    try {
      logger.info({ provider: provider.name }, 'Attempting AI completion');
      return await provider.fn(messages, tools, toolCallHandler);
    } catch (error: any) {
      lastError = error;
      const errorMsg = error.response?.data?.error?.message || error.message;
      logger.warn({ provider: provider.name, error: errorMsg }, 'AI provider failed, falling back');
      
      if (error.isToolError) throw error;
      continue;
    }
  }

  throw lastError || new Error('All AI providers failed');
}

/**
 * Helper for OpenAI-compatible providers
 */
async function openAiCompatibleChat(
  providerName: string,
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  tools: any[],
  toolCallHandler: (name: string, args: any) => Promise<any>
) {
  if (!apiKey) throw new Error(`Missing API key for ${providerName}`);
  
  let currentMessages = [...messages];
  let rounds = 0;
  const MAX_ROUNDS = 6;

  while (rounds < MAX_ROUNDS) {
    const response = await axios.post(`${baseUrl}/chat/completions`, {
      model,
      messages: currentMessages,
      tools: tools.map(t => ({ type: 'function', function: t })),
      tool_choice: 'auto',
    }, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
    });

    const message = response.data.choices[0].message;
    currentMessages.push(message);

    if (!message.tool_calls || message.tool_calls.length === 0) {
      return { content: message.content, history: currentMessages };
    }

    for (const toolCall of message.tool_calls) {
      const name = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      try {
        const result = await toolCallHandler(name, args);
        currentMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: name,
          content: JSON.stringify(result)
        });
      } catch (err: any) {
        currentMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: name,
          content: `Error: ${err.message}`
        });
      }
    }
    rounds++;
  }
  throw new Error(`Max tool calling rounds exceeded for ${providerName}`);
}

/**
 * Groq Provider (Primary)
 */
async function groqChat(messages: ChatMessage[], tools: any[], toolCallHandler: (name: string, args: any) => Promise<any>) {
  return openAiCompatibleChat('Groq', 'https://api.groq.com/openai/v1', process.env.GROQ_API_KEY || '', 'llama-3.3-70b-versatile', messages, tools, toolCallHandler);
}

/**
 * OpenRouter Provider (Fallback 1)
 */
async function openrouterChat(messages: ChatMessage[], tools: any[], toolCallHandler: (name: string, args: any) => Promise<any>) {
  const models = [
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemma-4-31b-it:free',
    'openai/gpt-oss-120b:free',
    'meta-llama/llama-3.2-3b-instruct:free',
    'liquid/lfm-2.5-1.2b-instruct:free',
    'qwen/qwen3-coder:free'
  ];

  let lastError = null;
  for (const model of models) {
    try {
      return await openAiCompatibleChat('OpenRouter', 'https://openrouter.ai/api/v1', process.env.OPENROUTER_API_KEY || '', model, messages, tools, toolCallHandler);
    } catch (err: any) {
      lastError = err;
      logger.warn({ model, error: err.message }, 'OpenRouter model failed, trying next...');
      continue;
    }
  }
  throw lastError || new Error('All OpenRouter models failed');
}

/**
 * Gemini Provider (Fallback 2)
 */
async function geminiChat(messages: ChatMessage[], tools: any[], toolCallHandler: (name: string, args: any) => Promise<any>) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    tools: [{ functionDeclarations: tools }]
  });

  const chat = model.startChat({
    history: messages.filter(m => m.role !== 'system' && m.role !== 'tool').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))
  });

  const userMessage = messages[messages.length - 1].content;
  let rounds = 0;
  const MAX_ROUNDS = 6;
  let currentPrompt = userMessage;

  while (rounds < MAX_ROUNDS) {
    const result = await chat.sendMessage(currentPrompt);
    const response = result.response;
    const calls = response.candidates?.[0]?.content?.parts?.filter(p => p.functionCall);

    if (!calls || calls.length === 0) {
      return { content: response.text(), history: [] };
    }

    const toolResponses = [];
    for (const call of calls) {
      const name = call.functionCall!.name;
      const args = call.functionCall!.args;
      try {
        const data = await toolCallHandler(name, args);
        toolResponses.push({
          functionResponse: { name, response: { content: data } }
        });
      } catch (err: any) {
        toolResponses.push({
          functionResponse: { name, response: { content: { error: err.message } } }
        });
      }
    }

    const nextResult = await chat.sendMessage(toolResponses as any);
    if (!nextResult.response.candidates?.[0]?.content?.parts?.some(p => p.functionCall)) {
      return { content: nextResult.response.text(), history: [] };
    }
    rounds++;
  }
  throw new Error('Max tool calling rounds exceeded');
}

/**
 * Mistral AI Provider (Fallback 3)
 */
async function mistralChat(messages: ChatMessage[], tools: any[], toolCallHandler: (name: string, args: any) => Promise<any>) {
  return openAiCompatibleChat('Mistral', 'https://api.mistral.ai/v1', process.env.MISTRAL_API_KEY || '', 'mistral-small-latest', messages, tools, toolCallHandler);
}

/**
 * Cohere Provider (Fallback 4)
 */
async function cohereChat(messages: ChatMessage[], tools: any[], toolCallHandler: (name: string, args: any) => Promise<any>) {
  return openAiCompatibleChat('Cohere', 'https://api.cohere.com/v1/compatibility/openai/v1', process.env.COHERE_API_KEY || '', 'command-r', messages, tools, toolCallHandler);
}

/**
 * Cerebras Provider (Fallback 5)
 */
async function cerebrasChat(messages: ChatMessage[], tools: any[], toolCallHandler: (name: string, args: any) => Promise<any>) {
  return openAiCompatibleChat('Cerebras', 'https://api.cerebras.ai/v1', process.env.CEREBRAS_API_KEY || '', 'llama3.1-70b', messages, tools, toolCallHandler);
}
