import { useChat } from '@ai-sdk/react';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatInput, Message, Wrapper } from './components.tsx';
import './tailwind.css';
import type { MyMessage } from '../api/chat.ts';
import { generateId } from 'ai';

const App = () => {
  const { messages, sendMessage, setMessages } =
    useChat<MyMessage>({});

  const [input, setInput] = useState(
    `How many R's are in the word strawberry?`,
  );

  const latestMessage = messages[messages.length - 1];

  // NOTE: This checks to see if the latest message is awaiting
  // a response. If it is, we want to disable the input field.
  const latestMessageIsAwaitingResponse =
    latestMessage?.role === 'assistant' &&
    latestMessage.parts.some(
      (part) => part.type === 'data-output',
    );

  return (
    <Wrapper>
      {messages.map((message, index) => (
        <Message
          key={message.id}
          role={message.role}
          parts={message.parts}
          onSelectModel={(partId) => {
            const part = message.parts
              .filter((part) => part.type === 'data-output')
              .find((part) => part.id === partId);

            if (!part) {
              return;
            }

            // TODO: The goal of onSelectModel is to take the two
            // data-output parts and replace them with a single text part -
            // the output we've chosen as the best one.

            // TODO: That means we need to update the messages in useChat
            // to replace the one we are currently on with a new message
            // that has a single text part.

            // TODO: Use messages.slice to take all the messages before
            // the current message.
            const newMessages = messages.slice(0, -1);

            // TODO: Push a new message to the newMessages array that
            // is a copy of the current message, but with the data-output
            // parts replaced with a text part.
            newMessages.push({
              id: generateId(),
              role: 'assistant',
              parts: [{ type: 'text', text: part.data.text }],
            });

            // TODO: Set the new messages array as the messages in useChat
            // (useChat returns a setMessages function)
            setMessages(newMessages);
          }}
        />
      ))}
      <ChatInput
        placeholder={
          latestMessageIsAwaitingResponse
            ? 'Select a response to continue...'
            : 'Say something...'
        }
        input={input}
        onChange={(e) => setInput(e.target.value)}
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage({
            text: input,
          });
          setInput('');
        }}
        disabled={latestMessageIsAwaitingResponse}
      />
    </Wrapper>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
