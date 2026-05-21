import { TOOL_DEFINITIONS } from '../../packages/ai/src/chatTools';
import dotenv from 'dotenv';
dotenv.config();

// We need to import the individual functions, but they are not exported.
// Let's modify aiProviders to export them temporarily or just mock the call.
import { chatWithFallback } from './src/lib/aiProviders';

const test = async () => {
  const messages = [{ role: 'system', content: 'You are a test agent' }, { role: 'user', content: 'hello' }];
  
  // We'll force OpenRouter by commenting out the others in aiProviders.ts temporarily? No, let's just observe what fails by checking the `failedProviders` output when we trigger a tool.
  const complexMessages = [
    { role: 'user', content: 'Can you list all the projects?' }
  ];

  try {
    const res = await chatWithFallback(complexMessages as any, TOOL_DEFINITIONS, async (name, args) => { return "tool executed: " + name; });
    console.log("Success:", res);
    console.log("Failed:", res.failedProviders);
    console.log("Stats:", res.allStats);
  } catch (err) {
    console.error("Test failed:", err);
  }
};
test();
