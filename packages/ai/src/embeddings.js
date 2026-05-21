"use strict";
// import { GoogleGenerativeAI } from "@google/generative-ai";
// import path from "path";
// import dotenv from "dotenv";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.embedText = embedText;
// // This forces it to look in the directory where you started the server (apps/api)
// dotenv.config({ path: path.resolve(process.cwd(), ".env") });
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
// const model = genAI.getGenerativeModel({ model: "text-embedding-005" }, { apiVersion: "v1" });
// const embeddingCache = new Map<string, number[]>();
// /**
//  * Generates an embedding for the given text using Gemini's text-embedding-004 model.
//  * Uses an in-memory cache to avoid redundant API calls for duplicate texts.
//  */
// export async function embedText(text: string): Promise<number[]> {
//   if (!text) return [];
//   // Check cache first
//   if (embeddingCache.has(text)) {
//     return embeddingCache.get(text)!;
//   }
//   try {
//     const result = await model.embedContent(text);
//     const embedding = result.embedding.values;
//     // Cache the result
//     embeddingCache.set(text, embedding);
//     return embedding;
//   } catch (error) {
//     console.error("Error generating embedding:", error);
//     throw error;
//   }
// }
const generative_ai_1 = require("@google/generative-ai");
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
// Look for .env in the process root (apps/api)
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), ".env") });
// Initialize the Google AI SDK
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
/**
 * text-embedding-005 is the 2026 stable successor to 004.
 * It natively supports 768 dimensions, making it a drop-in replacement
 * for your existing Supabase vector(768) columns.
 */
const model = genAI.getGenerativeModel({ model: "text-embedding-005" }, { apiVersion: "v1" });
const embeddingCache = new Map();
/**
 * Generates an embedding for the given text.
 * Uses an in-memory cache to optimize performance and reduce API costs.
 */
async function embedText(text) {
    if (!text)
        return [];
    // 1. Check local cache to avoid redundant network calls
    if (embeddingCache.has(text)) {
        return embeddingCache.get(text);
    }
    try {
        // 2. Generate embedding using the RETRIEVAL_QUERY task type
        // This informs Gemini the vector is for a chatbot search context.
        const result = await model.embedContent({
            content: { parts: [{ text }] },
            taskType: generative_ai_1.TaskType.RETRIEVAL_QUERY,
            // text-embedding-005 defaults to 768, but we explicitly set it 
            // here to ensure strict compatibility with 005_rag.sql.
            outputDimensionality: 768,
        });
        const embedding = result.embedding.values;
        // 3. Store in cache and return
        embeddingCache.set(text, embedding);
        return embedding;
    }
    catch (error) {
        console.error("Error generating embedding with text-embedding-005:", error);
        throw error;
    }
}
//# sourceMappingURL=embeddings.js.map