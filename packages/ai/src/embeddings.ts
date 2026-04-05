import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

const embeddingCache = new Map<string, number[]>();

/**
 * Generates an embedding for the given text using Gemini's text-embedding-004 model.
 * Uses an in-memory cache to avoid redundant API calls for duplicate texts.
 */
export async function embedText(text: string): Promise<number[]> {
  if (!text) return [];

  // Check cache first
  if (embeddingCache.has(text)) {
    return embeddingCache.get(text)!;
  }

  try {
    const result = await model.embedContent(text);
    const embedding = result.embedding.values;

    // Cache the result
    embeddingCache.set(text, embedding);

    return embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}
