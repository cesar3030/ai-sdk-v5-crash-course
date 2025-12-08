import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

const output = streamText({
  model: google('gemini-2.5-flash-lite'),
  prompt: `Which country makes the best sausages? Answer in a single paragraph.`,
});

for await (const chunk of output.textStream) {
  process.stdout.write(chunk);
}

const output2 = streamText({
  model: google('gemini-2.5-flash-lite'),
  prompt: `Which country makes the best pies? Answer in a single paragraph.`,
});

for await (const chunk of output2.textStream) {
  process.stdout.write(chunk);
}

console.log(); // Empty log to separate the output from the usage

// TODO: Print the usage to the console
const [usage, totalUsage, usage2, totalUsage2] =
  await Promise.all([
    output.usage,
    output.totalUsage,
    output2.usage,
    output2.totalUsage,
  ]);

console.log(usage);
console.log(totalUsage);
console.log(usage2);
console.log(totalUsage2);
