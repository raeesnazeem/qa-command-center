import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

export const geminiFlash = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
export const geminiEmbedding = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
