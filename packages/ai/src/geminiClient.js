"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.genAI = void 0;
const genai_1 = require("@google/genai");
require("dotenv/config");
exports.genAI = new genai_1.GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY || "" });
//# sourceMappingURL=geminiClient.js.map