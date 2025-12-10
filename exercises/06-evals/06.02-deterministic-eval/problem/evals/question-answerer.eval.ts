import { google } from '@ai-sdk/google';
import { tavily } from '@tavily/core';
import { generateText } from 'ai';
import { evalite } from 'evalite';
type Link = (typeof links)[number];
const links = [
  {
    title: 'TypeScript 5.8',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html',
  },
  {
    title: 'TypeScript 5.7',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-7.html',
  },
  {
    title: 'TypeScript 5.6',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-6.html',
  },
  {
    title: 'TypeScript 5.5',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html',
  },
  {
    title: 'TypeScript 5.4',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html',
  },
  {
    title: 'TypeScript 5.3',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-3.html',
  },
  {
    title: 'TypeScript 5.2',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html',
  },
  {
    title: 'TypeScript 5.1',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-1.html',
  },
  {
    title: 'TypeScript 5.0',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html',
  },
];

evalite('TS Release Notes', {
  data: () => [
    {
      input: 'Tell me about the TypeScript 5.8 release',
    },
    {
      input: 'Tell me about the TypeScript 5.2 release',
    },
  ],
  task: async (input) => {
    const pages = await getReleasesPageContent(links);
    const capitalResult = await generateText({
      model: google('gemini-2.5-flash-lite'),
      prompt: `
        You are a helpful assistant that can answer questions about TypeScript releases.

        <background-data>
          ${pages
            .map(
              ({ title, url, content }) => `
            <release>
             <version>${title}</version>
             <url>${url}</url>
             <content>${content}</content>

            </release>
          `,
            )
            .join('\n')}
        </background-data>

        <rules>
          - the output always includes the url of the article used to create the summary
          - the summary should always be shorter than 500 characters
        </rules>

        <question>
        ${input}
        </question>

        <output-format>
            the summary should just be 500chars max
        </output-format>
      `,
    });

    return capitalResult.text;
  },
  scorers: [
    {
      name: 'Includes Markdown Links',
      scorer: ({ input, output, expected }) => {
        return output.match(/\[[^\]]+\]\([^)]+\)/g) ? 1 : 0;
      },
    },
    {
      name: 'Output length',
      scorer: ({ input, output, expected }) => {
        return output.length <= 500 ? 1 : 0;
      },
    },
  ],
});

async function getReleasesPageContent(
  links: Link[],
): Promise<{ title: string; url: string; content: string }[]> {
  const tavilyClient = tavily({
    apiKey: process.env.TAVILY_API_KEY,
  });
  const scrapeResult = await tavilyClient.extract(
    links.map(({ url }) => url),
  );

  const releaseTitleByUrl = Object.fromEntries(
    links.map(({ title, url }) => [url, title]),
  );

  return scrapeResult.results.map(({ url, rawContent }) => ({
    url,
    content: rawContent,
    title: releaseTitleByUrl[url] ?? '',
  }));
}
