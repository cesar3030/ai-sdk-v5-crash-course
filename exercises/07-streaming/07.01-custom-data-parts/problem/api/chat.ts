import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type ModelMessage,
  type UIMessage,
} from 'ai';

export type MyMessage = UIMessage<
  never,
  {
    // TODO: Define the type for the suggestion data part
    suggestion: string;
  }
>;

export const POST = async (req: Request): Promise<Response> => {
  const body = await req.json();

  const messages: UIMessage[] = body.messages;

  const modelMessages: ModelMessage[] =
    convertToModelMessages(messages);

  const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
      const streamTextResult = streamText({
        model: google('gemini-2.5-flash-lite'),
        messages: modelMessages,
      });

      writer.merge(streamTextResult.toUIMessageStream());

      await streamTextResult.consumeStream();

      const followupSuggestionsResult = streamText({
        model: google('gemini-2.5-flash-lite'),
        messages: [
          ...modelMessages,
          {
            role: 'assistant',
            content: await streamTextResult.text,
          },
          {
            role: 'user',
            content:
              'What question should I ask next? Return only the question text.',
          },
        ],
      });

      // NOTE: Create an id for the data part
      const dataPartId = crypto.randomUUID();

      // NOTE: Create a variable to store the full suggestion,
      // since we need to store the full suggestion each time
      let fullSuggestion = '';

      for await (const chunk of followupSuggestionsResult.textStream) {
        // TODO: Append the chunk to the full suggestion
        fullSuggestion += chunk;

        // TODO: Call writer.write and write the data part
        // to the stream
        writer.write({
          type: 'data-suggestion',
          id: dataPartId,
          data: fullSuggestion,
        });
      }
    },
  });

  return createUIMessageStreamResponse({
    stream,
  });
};
