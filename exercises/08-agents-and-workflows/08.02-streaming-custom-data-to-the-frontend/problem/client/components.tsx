import type { UIMessage } from 'ai';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { MyMessage } from '../api/chat.ts';

export const Wrapper = (props: {
  children: React.ReactNode;
}) => {
  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {props.children}
    </div>
  );
};

// TODO: use this component to handle the custom data parts
// you have created in the api/chat.ts file
export const Message = ({
  role,
  parts,
}: {
  role: string;
  parts: MyMessage['parts'];
}) => (
  <div className="my-4">
    {parts.map((part) => {
      // TODO: use this component to handle the custom data parts
      // you have created in the api/chat.ts file

      if (part.type === 'text') {
        return (
          <div className="mb-4 text-white">
            <ReactMarkdown>
              {(role === 'user' ? 'User: ' : 'AI: ') + part.text}
            </ReactMarkdown>
          </div>
        );
      } else if (part.type === 'data-draft') {
        return (
          <>
            <div className="mb-4 text-grey text-2xl">
              Initial Draft
            </div>
            <div className="mb-4 text-white">
              <ReactMarkdown>
                {(role === 'user' ? 'User: ' : 'AI: ') +
                  part.data}
              </ReactMarkdown>
            </div>
          </>
        );
      } else if (part.type === 'data-evaluation') {
        return (
          <>
            <div className="mb-4 text-grey text-2xl">
              Feedback
            </div>
            <div className="mb-4 text-white">
              <ReactMarkdown>
                {(role === 'user' ? 'User: ' : 'AI: ') +
                  part.data}
              </ReactMarkdown>
            </div>
          </>
        );
      }

      return null;
    })}
  </div>
);

export const ChatInput = ({
  input,
  onChange,
  onSubmit,
  disabled,
}: {
  input: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled?: boolean;
}) => (
  <form onSubmit={onSubmit}>
    <input
      className={`fixed bottom-0 w-full max-w-md p-2 mb-8 border-2 border-zinc-700 rounded shadow-xl bg-gray-800 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      value={input}
      placeholder={
        disabled
          ? 'Please handle tool calls first...'
          : 'Say something...'
      }
      onChange={onChange}
      disabled={disabled}
      autoFocus
    />
  </form>
);
