"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareScreenshots = compareScreenshots;
const geminiClient_1 = require("./geminiClient");
/**
 * compareScreenshots
 * Sends the Figma design (Image 1) and the live website screenshot (Image 2) to Gemini Vision.
 * Identifies visual discrepancies and returns them as a structured list.
 */
async function compareScreenshots(figmaBuffer, siteBuffer, pageUrl) {
    const prompt = `You are a QA visual diff tool reviewing the page: ${pageUrl}. 
Image 1 is the Figma design. Image 2 is the live website screenshot. 
Compare them precisely. List ALL visual discrepancies as JSON: 
[{"issue": "string", "severity": "critical"|"high"|"medium"|"low", "area": "string", "type": "layout"|"color"|"typography"|"missing_element"|"extra_element"|"spacing"}]. 
Be specific. Return [] if designs match. Return ONLY JSON. Do not include markdown formatting.`;
    const promptParts = [
        prompt,
        {
            inlineData: {
                data: figmaBuffer.toString('base64'),
                mimeType: 'image/png'
            }
        },
        {
            inlineData: {
                data: siteBuffer.toString('base64'),
                mimeType: 'image/png'
            }
        }
    ];
    try {
        const result = await geminiClient_1.geminiFlash.generateContent(promptParts);
        const response = await result.response;
        const resultText = response.text().trim();
        // Attempt to parse JSON. Sometimes Gemini might still include markdown JSON fences.
        let cleanJsonText = resultText;
        if (cleanJsonText.startsWith('```')) {
            const lastTickIndex = cleanJsonText.lastIndexOf('```');
            const firstNewline = cleanJsonText.indexOf('\n');
            if (firstNewline !== -1 && lastTickIndex > firstNewline) {
                cleanJsonText = cleanJsonText.substring(firstNewline, lastTickIndex).trim();
            }
        }
        // Additional cleanup: remove "json" keyword if it remains
        if (cleanJsonText.startsWith('json')) {
            cleanJsonText = cleanJsonText.substring(4).trim();
        }
        try {
            const issues = JSON.parse(cleanJsonText);
            return {
                issues: Array.isArray(issues) ? issues : [],
                rawResponse: resultText
            };
        }
        catch (parseError) {
            console.error('Failed to parse Gemini visual diff result:', parseError, 'Raw response:', resultText);
            return { issues: [], rawResponse: resultText };
        }
    }
    catch (error) {
        console.error('Gemini visual diff analysis failed:', error);
        return { issues: [] };
    }
}
//# sourceMappingURL=visualDiffAnalyzer.js.map