import { google } from '@ai-sdk/google';
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamObject,
  streamText,
  type UIMessage,
} from 'ai';
import z from 'zod';

export type MyMessage = UIMessage<
  unknown,
  {
    'slack-message': string;
    'slack-message-feedback': string;
  }
>;

const formatMessageHistory = (messages: UIMessage[]) => {
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

  Output format:
  you should output a js object with a boolean attribute "isGoodEnough" set to true if the draft was properly written else wise return false.
  If the "isGoodEnough: attribute is set to false, add another attribute called "feedback" set to a string holding the explanations of what went wrong
`;

export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: MyMessage[] } = await req.json();
  const { messages } = body;

  const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
      writer.write({
        type: 'start',
      });

      let step = 0;
      let mostRecentDraft = '';
      let mostRecentFeedback = '';

      while (step < 2) {
        // Write Slack message
        const writeSlackResult = streamText({
          model: google('gemini-2.5-flash-lite'),
          system: WRITE_SLACK_MESSAGE_FIRST_DRAFT_SYSTEM,
          prompt: `
          Conversation history:
          ${formatMessageHistory(messages)}

          Previous draft (if any):
          ${mostRecentDraft}

          Previous feedback (if any):
          ${mostRecentFeedback}
        `,
        });

        const draftId = crypto.randomUUID();

        let draft = '';

        for await (const part of writeSlackResult.textStream) {
          draft += part;

          writer.write({
            type: 'data-slack-message',
            data: draft,
            id: draftId,
          });
        }

        mostRecentDraft = draft;

        // TODO: change this to streamObject, and get it to return
        // the feedback as a string, as well as whether we should
        // break the loop early (that the message is good enough)
        const evaluateSlackResult = streamObject({
          model: google('gemini-2.5-flash-lite'),
          system: EVALUATE_SLACK_MESSAGE_SYSTEM,
          prompt: `
            Conversation history:
            ${formatMessageHistory(messages)}

            Most recent draft:
            ${mostRecentDraft}

            Previous feedback (if any):
            ${mostRecentFeedback}
          `,
          schema: z.object({
            feedback: z.string().optional(),
            isGoodEnough: z.boolean(),
          }),
        });

        const feedbackId = crypto.randomUUID();

        let isGoodEnough = false;
        let feedback;

        for await (const part of evaluateSlackResult.partialObjectStream) {
          if (part.isGoodEnough) {
            isGoodEnough = true;
            break;
          }

          if (part.feedback) {
            feedback = part.feedback;
            writer.write({
              type: 'data-slack-message-feedback',
              data: feedback,
              id: feedbackId,
            });
          }
        }

        if (isGoodEnough) {
          break;
        }

        mostRecentFeedback = feedback ?? '';

        step++;
      }

      const textPartId = crypto.randomUUID();

      writer.write({
        type: 'text-start',
        id: textPartId,
      });

      writer.write({
        type: 'text-delta',
        delta: mostRecentDraft,
        id: textPartId,
      });

      writer.write({
        type: 'text-end',
        id: textPartId,
      });
    },
  });

  return createUIMessageStreamResponse({
    stream,
  });
};
