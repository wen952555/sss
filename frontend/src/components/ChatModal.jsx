import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';
import './ChatModal.css';

const ChatModal = ({ item, onClose, onCorrect }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Initial message from the AI
    useEffect(() => {
        setMessages([
            {
                sender: 'ai',
                text: `I see an issue with this line: "${item.original_text}". How should I correct it? For example, you can say "Change the numbers to 1, 2, 3" or "The amount should be 10".`
            }
        ]);
    }, [item]);

    // Scroll to the bottom of the message list when new messages are added
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/correct_bet.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    original_item: item,
                    conversation: [...messages, userMessage]
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'The AI failed to respond.');
            }

            // If the AI confirms a correction is complete
            if (data.correction_complete) {
                onCorrect(item.original_text, data.updated_item);
                // The modal will close via the onCorrect handler
            } else {
                 setMessages(prev => [...prev, { sender: 'ai', text: data.reply }]);
            }

        } catch (error) {
            setMessages(prev => [...prev, { sender: 'ai', text: `Error: ${error.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Correcting Bet Slip</h2>
                    <button onClick={onClose} className="close-button">&times;</button>
                </div>
                <div className="messages-container">
                    {messages.map((msg, index) => (
                        <div key={index} className={`message ${msg.sender}`}>
                            <p>{msg.text}</p>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSend} className="message-form">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your correction here..."
                        disabled={isLoading}
                        className="message-input"
                    />
                    <button type="submit" disabled={isLoading} className="send-button">
                        {isLoading ? '...' : 'Send'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatModal;