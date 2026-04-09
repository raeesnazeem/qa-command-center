import { Router, Request, Response } from 'express';
import { clerkAuth } from '../middleware/clerkAuth';
import { aiRateLimiter } from '../middleware/rateLimiter';
import { supabase } from '../lib/supabase';
import { embedText } from '@qacc/ai';
import { geminiFlash } from '@qacc/ai';
import { logger } from '../lib/logger';

const router: Router = Router();

/**
 * POST /api/chat
 * RAG-based chatbot using Gemini 1.5 Flash and Supabase vector search.
 */
router.post('/', clerkAuth, aiRateLimiter, async (req: Request, res: Response) => {
  const { message, project_id, run_id } = req.body;
  const { orgId } = req.auth!;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Step 1: Embed the user's message
    const embedding = await embedText(message);

    // Step 2: Retrieve top 8 similar records from Supabase
    const { data: matches, error: matchError } = await supabase.rpc('match_embeddings', {
      query_embedding: embedding,
      match_count: 8,
      p_org_id: orgId
    });

    if (matchError) {
      logger.error({ matchError }, 'Error matching embeddings');
      throw matchError;
    }

    // Step 3: Build context string from retrieved records
    const contextParts = (matches || []).map((m: any) => {
      const truncatedContent = m.content.substring(0, 300);
      return `[Source: ${m.source_type}, ID: ${m.source_id}] ${truncatedContent}`;
    });
    const contextString = contextParts.join('\n\n');

    // Step 4 & 5: Stream response using Gemini and SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const systemPrompt = "You are a QA assistant for a web development team. Answer questions using ONLY the provided context. Always cite your sources by mentioning the page URL or finding ID. Be concise and direct.";
    
    const prompt = `
Context:
${contextString}

User Message: ${message}
`;

    const result = await geminiFlash.generateContentStream([systemPrompt, prompt]);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        res.write(`data: ${chunkText}\n\n`);
      }
    }

    // Step 6: Return source citations and DONE
    const citations = (matches || []).map((m: any) => ({
      source_type: m.source_type,
      source_id: m.source_id,
      content: m.content.substring(0, 100) + '...'
    }));

    res.write(`data: ${JSON.stringify({ citations })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error: any) {
    logger.error({ error: error.message }, 'Error in chat route');
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to process chat message' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
      res.end();
    }
  }
});

export { router as chatRouter };
