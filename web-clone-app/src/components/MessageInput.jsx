import { useState } from 'react';
import './MessageInput.css';

function MessageInput({ onSend, disabled }) {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter website URL (e.g., https://example.com)"
        disabled={disabled}
      />
      <button type="submit" disabled={disabled || !input.trim()}>
        {disabled ? 'Processing...' : 'Clone'}
      </button>
    </form>
  );
}

export default MessageInput;
