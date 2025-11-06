import React, { useState } from 'react';
import { FiX, FiMessageSquare } from 'react-icons/fi';
import axios from 'axios';

const AIChatAssistant = ({ onClose }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    try {
      const userMessage = { content: input, isBot: false };
      setMessages(prev => [...prev, userMessage]);

      const response = await axios.post('http://localhost:5000/api/ai/chat', 
        { message: input },
        { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } }
      );

      setMessages(prev => [...prev, {
        content: response.data.response,
        isBot: true
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        content: "Sorry, I'm having trouble connecting to the AI service.",
        isBot: true
      }]);
    } finally {
      setLoading(false);
      setInput('');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-xl border">
      <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
        <div className="flex items-center">
          <FiMessageSquare className="mr-2" />
          <h3 className="font-semibold">AI Project Assistant</h3>
        </div>
        <FiX className="cursor-pointer" onClick={onClose} />
      </div>
      
      <div className="h-96 p-4 overflow-y-auto">
        {messages.map((msg, index) => (
          <div key={index} className={`mb-4 ${msg.isBot ? 'text-left' : 'text-right'}`}>
            <div className={`inline-block p-3 rounded-lg ${
              msg.isBot ? 'bg-gray-100' : 'bg-blue-100'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && <div className="text-center text-gray-500">Thinking...</div>}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 p-2 border rounded-lg"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default AIChatAssistant;