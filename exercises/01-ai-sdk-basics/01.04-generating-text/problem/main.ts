import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

// TODO: Choose a model. I recommend using the Google Gemini model:
// gemini-2.5-flash-lite
const model = google('gemini-2.5-flash-lite');

const prompt = 'What is the capital of France?';

const result = await generateText({
  model,
  prompt,
});

console.log(result.text);
