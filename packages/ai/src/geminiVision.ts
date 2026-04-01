import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';
import PQueue from 'p-queue';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Rate limit: 15 calls per minute (60000ms)
const queue = new PQueue({
  intervalCap: 15,
  interval: 60000,
  carryoverConcurrencyCount: true
});

/**
 * analyzeImage
 * Sends an image buffer and a prompt to Gemini 1.5 Flash.
 * Returns the raw text response from the model.
 * Handles errors gracefully and adheres to rate limits.
 */
export async function analyzeImage(imageBuffer: Buffer, prompt: string): Promise<string> {
  return queue.add(async () => {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const imageParts = [
        {
          inlineData: {
            data: imageBuffer.toString("base64"),
            mimeType: "image/png",
          },
        },
      ];

      const result = await model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Gemini Vision API error:", error);
      return "";
    }
  }) as Promise<string>;
}

export interface VisionIssue {
  issue: string;
  severity: 'high' | 'medium' | 'low';
  area: string;
}

/**
 * analyzeScreenshot (Legacy/Helper)
 * Specialized helper that uses analyzeImage with a predefined prompt
 * and parses the resulting JSON.
 */
export async function analyzeScreenshot(imageBuffer: Buffer): Promise<VisionIssue[]> {
  const prompt = `Inspect this website screenshot carefully. Identify ONLY: (1) images that have visible watermarks, (2) images that are clearly blurry or pixelated at this resolution, (3) obvious layout breaks where content is overlapping. Return a JSON array: [{issue: string, severity: 'high'|'medium'|'low', area: string}]. Return empty array [] if no issues found.`;
  
  const text = await analyzeImage(imageBuffer, prompt);
  
  try {
    const jsonMatch = text.match(/\[.*\]/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (error) {
    console.error("Failed to parse Gemini Vision response:", error);
    return [];
  }
}
