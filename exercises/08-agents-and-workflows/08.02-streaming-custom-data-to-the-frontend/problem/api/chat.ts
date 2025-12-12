import { google } from '@ai-sdk/google';
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  generateText,
  streamText,
  type UIMessage,
} from 'ai';

// TODO: replace all instances of UIMessage with MyMessage
export type MyMessage = UIMessage<
  unknown,
  {
    draft: string;
    evaluation: string;
  }
>;

const formatMessageHistory = (messages: MyMessage[]) => {
  return messages
    .map((message) => {
      return `${message.role}: ${message.parts
        .map((part) => {
          if (part.type === 'text') {
            return part.text;
          }

          return '';
        })
        .join('')}`;
    })
    .join('\n');
};

const WRITE_SLACK_MESSAGE_FIRST_DRAFT_SYSTEM = `You are writing a Slack message for a user based on the conversation history. Only return the Slack message, no other text.`;
const EVALUATE_SLACK_MESSAGE_SYSTEM = `You are evaluating the Slack message produced by the user.

  Evaluation criteria:
  - The Slack message should be written in a way that is easy to understand.
  - It should be appropriate for a professional Slack conversation.
`;
const WRITE_SLACK_MESSAGE_FINAL_SYSTEM = `You are writing a Slack message based on the conversation history, a first draft, and some feedback given about that draft.

  Return only the final Slack message, no other text.
`;

export const POST = async (req: Request): Promise<Response> => {
  // TODO: change to MyMessage[]
  const body: { messages: MyMessage[] } = await req.json();
  const { messages } = body;

  const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
      // TODO: write a { type: 'start' } message via writer.write
      writer.write({ type: 'start' });

      // TODO - change to streamText and write to the stream as custom data parts
      const writeSlackResult = await streamText({
        model: google('gemini-2.5-flash-lite'),
        system: WRITE_SLACK_MESSAGE_FIRST_DRAFT_SYSTEM,
        prompt: `
          Conversation history:
          ${formatMessageHistory(messages)}
        `,
      });

      const draftId = generateId();
      let draft = '';
      for await (const chunk of writeSlackResult.textStream) {
        draft += chunk;
        writer.write({
          type: 'data-draft',
          data: draft,
          id: draftId,
        });
      }

      // TODO - change to streamText and write to the stream as custom data parts
      const evaluateSlackResult = await streamText({
        model: google('gemini-2.5-flash-lite'),
        system: EVALUATE_SLACK_MESSAGE_SYSTEM,
        prompt: `
          Conversation history:
          ${formatMessageHistory(messages)}

          Slack message:
          ${await writeSlackResult.text}
        `,
      });

      const evalId = generateId();
      let evaluation = '';
      for await (const chunk of evaluateSlackResult.textStream) {
        evaluation += chunk;
        writer.write({
          type: 'data-evaluation',
          data: evaluation,
          id: draftId,
        });
      }

      const finalSlackAttempt = streamText({
        model: google('gemini-2.5-flash-lite'),
        system: WRITE_SLACK_MESSAGE_FINAL_SYSTEM,
        prompt: `
          Conversation history:
          ${formatMessageHistory(messages)}

          First draft:
          ${await writeSlackResult.text}

          Previous feedback:
          ${await evaluateSlackResult.text}
        `,
      });

      // TODO: merge the final slack attempt into the stream,
      // sending sendStart: false
      writer.merge(
        finalSlackAttempt.toUIMessageStream({
          sendStart: false,
        }),
      );
    },
  });

  return createUIMessageStreamResponse({
    stream,
  });
};
