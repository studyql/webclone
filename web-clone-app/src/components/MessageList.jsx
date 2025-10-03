import Message from './Message';
import './MessageList.css';

function MessageList({ messages, messagesEndRef }) {
  return (
    <div className="message-list">
      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessageList;
