"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.geminiQueue = void 0;
exports.queueGeminiCall = queueGeminiCall;
const p_queue_1 = __importDefault(require("p-queue"));
exports.geminiQueue = new p_queue_1.default({
    concurrency: 1,
    interval: 4000,
});
/**
 * All Gemini calls must go through this queue to respect rate limits.
 * 15 requests per minute = 1 request every 4 seconds.
 */
async function queueGeminiCall(fn) {
    return exports.geminiQueue.add(fn);
}
//# sourceMappingURL=rateLimiter.js.map