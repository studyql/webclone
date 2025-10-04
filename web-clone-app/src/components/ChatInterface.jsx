import { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { cloneWebsite } from '../services/cloneService';
import './ChatInterface.css';

function ChatInterface() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: 'Welcome to Web Clone! Give me a website URL and I\'ll clone it for you.',
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (type, content, downloadData = null) => {
    const newMessage = {
      id: Date.now(),
      type,
      content,
      timestamp: new Date(),
      downloadData
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = async (userInput) => {
    addMessage('user', userInput);
    setIsProcessing(true);

    try {
      const chatResponse = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userInput }),
      });

      if (!chatResponse.ok) {
        const errorData = await chatResponse.json();
        throw new Error(errorData.error || 'Failed to process message');
      }

      const chatData = await chatResponse.json();

      for (const response of chatData.responses) {
        addMessage('assistant', response);
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      if (chatData.url) {
        const result = await cloneWebsite(chatData.url, (status) => {
          addMessage('assistant', status);
        });

        if (result.success) {
          addMessage('assistant', chatData.finalMessage, result.zipData);
        } else {
          addMessage('assistant', `Error: ${result.error}`);
        }
      } else {
        addMessage('assistant', chatData.finalMessage);
      }
    } catch (error) {
      addMessage('assistant', `An error occurred: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h1>Web Clone</h1>
        <p>Clone any website with a single click</p>
      </div>
      <MessageList messages={messages} messagesEndRef={messagesEndRef} />
      <MessageInput onSend={handleSendMessage} disabled={isProcessing} />
    </div>
  );
}

export default ChatInterface;
