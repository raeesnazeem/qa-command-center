"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geminiEmbedding = exports.geminiFlash = void 0;
const generative_ai_1 = require("@google/generative-ai");
require("dotenv/config");
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");
exports.geminiFlash = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
exports.geminiEmbedding = genAI.getGenerativeModel({ model: "text-embedding-004" });
//# sourceMappingURL=geminiClient.js.map