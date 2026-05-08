"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeRebuttal = analyzeRebuttal;
const geminiClient_1 = require("./geminiClient");
async function analyzeRebuttal(params) {
    const promptText = `You are an impartial QA reviewer. A QA finding was reported (see image 1 and description). A developer submitted a rebuttal claiming it is fixed (see image 2 and explanation). Determine: is this issue now resolved? Return JSON ONLY: {"verdict": "resolved"|"disputed", "confidence": 0-100, "reasoning": "string (max 200 chars)"}. Be objective.

Finding Description:
${params.findingDescription}

Developer Rebuttal Explanation:
${params.rebuttalText}`;
    // Use array of Parts format for Gemini multi-modal input
    const promptParts = [
        promptText,
        {
            inlineData: {
                data: params.findingScreenshotBuffer.toString('base64'),
                mimeType: 'image/png'
            }
        }
    ];
    if (params.rebuttalScreenshotBuffer) {
        promptParts.push({
            inlineData: {
                data: params.rebuttalScreenshotBuffer.toString('base64'),
                mimeType: 'image/png'
            }
        });
    }
    try {
        const response = await geminiClient_1.geminiFlash.generateContent(promptParts);
        const resultText = response.response.text();
        // Strip markdown JSON block fences
        let cleanJsonText = resultText.trim();
        if (cleanJsonText.startsWith('```')) {
            const lastTickIndex = cleanJsonText.lastIndexOf('```');
            const firstNewline = cleanJsonText.indexOf('\n');
            if (firstNewline !== -1 && lastTickIndex > firstNewline) {
                cleanJsonText = cleanJsonText.substring(firstNewline, lastTickIndex).trim();
            }
        }
        const payload = JSON.parse(cleanJsonText);
        return {
            verdict: payload.verdict === 'resolved' ? 'resolved' : 'disputed',
            confidence: typeof payload.confidence === 'number' ? payload.confidence : 0,
            reasoning: payload.reasoning?.substring(0, 200) || '',
        };
    }
    catch (error) {
        console.error('Failed to analyze rebuttal with Gemini Vision:', error);
        // Fallback in case of AI parsing failure to not crash the flow
        return {
            verdict: 'disputed',
            confidence: 0,
            reasoning: 'Error during AI evaluation.',
        };
    }
}
//# sourceMappingURL=rebuttalAnalyzer.js.map