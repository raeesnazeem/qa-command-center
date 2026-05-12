import Groq from 'groq-sdk';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from './logger';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
    { name: 'gemini', fn: geminiChat }
  ];

  let lastError: any = null;

  for (const provider of providers) {
    try {
      logger.info({ provider: provider.name }, 'Attempting AI completion');
      return await provider.fn(messages, tools, toolCallHandler);
    } catch (error: any) {
      lastError = error;
      logger.warn({ provider: provider.name, error: error.message }, 'AI provider failed, falling back');
      
      // If it's a tool execution error (from the handler), we don't fallback, we let the LLM handle it
      if (error.isToolError) throw error;
      
      continue;
    }
  }

  throw lastError || new Error('All AI providers failed');
}

/**
 * Groq Provider (Primary)
 */
async function groqChat(messages: ChatMessage[], tools: any[], toolCallHandler: (name: string, args: any) => Promise<any>) {
  let currentMessages = [...messages];
  let rounds = 0;
  const MAX_ROUNDS = 6;

  while (rounds < MAX_ROUNDS) {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: currentMessages as any,
      tools: tools.map(t => ({ type: 'function', function: t })),
      tool_choice: 'auto',
    });

    const message = response.choices[0].message;
    currentMessages.push(message as any);

    if (!message.tool_calls || message.tool_calls.length === 0) {
      return { content: message.content, history: currentMessages };
    }

    // Execute tool calls
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
        } as any);
      } catch (err: any) {
        currentMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: name,
          content: `Error: ${err.message}`
        } as any);
      }
    }
    rounds++;
  }

  throw new Error('Max tool calling rounds exceeded');
}

/**
 * OpenRouter Provider (Fallback 1)
 */
async function openrouterChat(messages: ChatMessage[], tools: any[], toolCallHandler: (name: string, args: any) => Promise<any>) {
  let currentMessages = [...messages];
  let rounds = 0;
  const MAX_ROUNDS = 6;

  while (rounds < MAX_ROUNDS) {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'deepseek/deepseek-chat',
      messages: currentMessages,
      tools: tools.map(t => ({ type: 'function', function: t })),
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
        'X-Title': 'QA Command Center'
      }
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
  throw new Error('Max tool calling rounds exceeded');
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
    history: messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))
  });

  // Note: Gemini handles history slightly differently. This is a simplified version.
  // For a full agentic loop with Gemini, we'd iterate like above.
  const systemPrompt = messages.find(m => m.role === 'system')?.content || '';
  const userMessage = messages[messages.length - 1].content;

  let rounds = 0;
  const MAX_ROUNDS = 6;
  let currentPrompt = userMessage;

  while (rounds < MAX_ROUNDS) {
    const result = await chat.sendMessage(currentPrompt);
    const response = result.response;
    const calls = response.candidates?.[0]?.content?.parts?.filter(p => p.functionCall);

    if (!calls || calls.length === 0) {
      return { content: response.text(), history: [] }; // Simplified history return
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
