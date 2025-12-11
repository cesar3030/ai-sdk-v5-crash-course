import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  RetryError,
} from 'ai';

export const POST = async (req: Request): Promise<Response> => {
  // All the AI SDK errors are available here:
  // https://ai-sdk.dev/docs/reference/ai-sdk-errors
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      throw new RetryError({
        errors: [new Error('An error occurred')],
        message: 'Maximum retries exceeded',
        reason: 'maxRetriesExceeded',
      });
    },
    onError(error) {
      // TODO: Check if the error is a RetryError using:
      // RetryError.isInstance(error)
      if (RetryError.isInstance(error)) {
        // TODO: If it is, return a message that tells the user to try again
        return 'Please retry';
      }

      // TODO: Return a default message if the error is not a RetryError
      return 'Something went wrong, soooooo wrong!';
    },
  });

  return createUIMessageStreamResponse({
    stream,
  });
};
