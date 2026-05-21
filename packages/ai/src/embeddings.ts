import { genAI } from './geminiClient';

export async function generateEmbedding(text: string): Promise<number[]> {
  const models = ['gemini-embedding-2-preview'];
  let lastError: any = null;

  for (const modelName of models) {
    try {
      const result = await genAI.models.embedContent({
        model: modelName,
        contents: { role: 'user', parts: [{ text }] },
        config: {
          taskType: 'RETRIEVAL_QUERY',
          outputDimensionality: 768,
        }
      });
      const values = result.embeddings?.[0]?.values || (result as any).embedding?.values;
      if (!values) {
        throw new Error("No embedding values returned");
      }
      return values;
    } catch (e: any) {
      lastError = e;
      const isRateLimit = e.status === 429 || e.statusCode === 429 || e.response?.status === 429 || (typeof e.message === 'string' && (e.message.includes('429') || e.message.includes('RESOURCE_EXHAUSTED') || e.message.includes('Quota exceeded')));
      if (isRateLimit) {
        e.status = 429;
        throw e;
      }
      console.warn(`Failed to generate embedding with ${modelName}: ${e.message}`);
      continue;
    }
  }

  throw lastError || new Error('All Gemini embedding models failed');
}