import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  generateText,
  streamText,
  type ModelMessage,
  type UIMessage,
} from 'ai';
import { GUARDRAIL_SYSTEM } from './guardrail-prompt.ts';

export const POST = async (req: Request): Promise<Response> => {
  const body = await req.json();

  const messages: UIMessage[] = body.messages;

  const modelMessages: ModelMessage[] =
    convertToModelMessages(messages);

  const stream = createUIMessageStream<UIMessage>({
    execute: async ({ writer }) => {
      console.time('Guardrail Time');
      // TODO: Use generateText to call a model, passing in the modelMessages
      // and the GUARDRAIL_SYSTEM prompt.

      const lastMessage =
        modelMessages[modelMessages.length - 1];
      if (
        !lastMessage ||
        lastMessage.role !== 'user' ||
        !lastMessage.content
      ) {
        throw new Error('missing valid user message');
      }

      const prompt = Array.isArray(lastMessage.content)
        ? lastMessage.content.reduce((acc, part) => {
            if (part.type === 'text') {
              acc += ` ${part.text}`;
            }
            return acc;
          }, '')
        : lastMessage.content;

      // eslint-disable-next-line no-console
      console.log(
        `\n\nlastMessage.content => `,
        lastMessage.content,
      );
      const guardrailResult = await generateText({
        model: google('gemini-2.5-flash-lite'),
        system: GUARDRAIL_SYSTEM,
        prompt,
      });

      console.timeEnd('Guardrail Time');

      const stopExecution = guardrailResult.text.trim() === '0';
      console.log(
        'guardrailResult',
        guardrailResult.text.trim(),
      );

      // TODO: If the guardrailResult is '0', write a standard reply
      // to the frontend using text-start, text-delta, and text-end
      // parts. Then, do an early return to prevent the rest of the
      // stream from running.
      // (make sure you trim the guardrailResult.text before checking it)
      if (stopExecution) {
        const id = generateId();
        writer.write({ id, type: 'text-start' });
        writer.write({
          type: 'text-delta',
          delta: "I can't answer this question",
          id,
        });
        writer.write({ id, type: 'text-end' });
        return;
      }

      const streamTextResult = streamText({
        model: google('gemini-2.5-flash-lite'),
        messages: modelMessages,
      });

      writer.merge(streamTextResult.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({
    stream,
  });
};
