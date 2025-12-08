import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  streamText,
  tool,
  type UIMessage,
  stepCountIs,
} from 'ai';
import * as fsTools from './file-system-functionality.ts';
import { z } from 'zod';

export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: UIMessage[] } = await req.json();
  const { messages } = body;

  const result = streamText({
    model: google('gemini-2.5-flash-lite'),
    messages: convertToModelMessages(messages),
    system: `
      You are a helpful assistant that can use a sandboxed file system to create, edit and delete files.

      You have access to the following tools:
      - writeFile
      - readFile
      - deletePath
      - listDirectory
      - createDirectory
      - exists
      - searchFiles

      Use these tools to record notes, create todo lists, and edit documents for the user.

      Use markdown files to store information.
    `,
    // TODO: add the tools to the streamText call,
    tools: {
      writeFile: tool({
        name: 'writeFile',
        description:
          'tool that creates a file at the given path containing the provider content',
        inputSchema: z.object({
          filePath: z
            .string()
            .describe('The path to the file to create'),
          content: z
            .string()
            .describe('The content of the file to create'),
        }),
        execute: async ({ filePath, content }) =>
          fsTools.writeFile(filePath, content),
      }),
      readFile: tool({
        name: 'readFile',
        description:
          'Returns the content of the file located at the given path',
        inputSchema: z.object({
          filePath: z
            .string()
            .describe('The path to the file to read'),
        }),
        execute: async ({ filePath }) =>
          fsTools.readFile(filePath),
      }),
      deletePath: tool({
        name: 'deletePath',
        description:
          'Deletes the file or directory located at the given path',
        inputSchema: z.object({
          filePath: z
            .string()
            .describe(
              'The path to the file or directory to delete',
            ),
        }),
        execute: async ({ filePath }) =>
          fsTools.deletePath(filePath),
      }),
      listDirectory: tool({
        name: 'listDirectory',
        description:
          'Lists the files and directories in the given path',
        inputSchema: z.object({
          path: z
            .string()
            .describe('The path to the directory to list'),
        }),
        execute: async ({ path }) => fsTools.listDirectory(path),
      }),
      createDirectory: tool({
        name: 'createDirectory',
        description: 'Creates a directory at the given path',
        inputSchema: z.object({
          path: z
            .string()
            .describe('The path to the directory to create'),
        }),
        execute: async ({ path }) =>
          fsTools.createDirectory(path),
      }),
      exists: tool({
        name: 'exists',
        description:
          'Checks if a file or directory exists at the given path',
        inputSchema: z.object({
          path: z
            .string()
            .describe(
              'The path to the file or directory to check',
            ),
        }),
        execute: async ({ path }) => fsTools.exists(path),
      }),
      searchFiles: tool({
        name: 'searchFiles',
        description:
          'Searches for files matching the given pattern in the given path',
        inputSchema: z.object({
          pattern: z
            .string()
            .describe('The pattern to search for'),
        }),
        execute: async ({ pattern }) =>
          fsTools.searchFiles(pattern),
      }),
    },
    // TODO: add a custom stop condition to the streamText call
    // to force the agent to stop after 10 steps have been taken
    stopWhen: [stepCountIs(5)],
  });

  return result.toUIMessageStreamResponse();
};
