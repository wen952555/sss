import React, { useState } from 'react';
import ChatModal from '../components/ChatModal'; // Will be created in the next step
import './BetParserPage.css';

const BetParserPage = () => {
    const [inputText, setInputText] = useState('');
    const [parsedData, setParsedData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);

    const sampleText = "香港：10, 22, 34, 46, 鼠, 马, 红波 各 5元\n澳门: 01-10, 单, 大 各 10块\n15.27.39各2元";

    const handleParse = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/bet_parser.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: inputText }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || `HTTP error! status: ${response.status}`);
            setParsedData(data);
        } catch (e) {
            setError(`解析失败: ${e.message}`);
            setParsedData([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCorrectClick = (item) => {
        setCurrentItem(item);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentItem(null);
    };

    const handleCorrection = (originalText, updatedItem) => {
        const updatedData = parsedData.map(item =>
            item.original_text === originalText ? { ...item, ...updatedItem, original_text: originalText } : item
        );
        setParsedData(updatedData);
        handleCloseModal();
    };

    const renderNumbers = (numbers) => {
        if (!numbers || numbers.length === 0) return 'N/A';
        if (numbers.length > 10) return `${numbers.slice(0, 10).join(', ')}... (${numbers.length}个)`;
        return numbers.join(', ');
    };

    return (
        <div className="bet-parser-page">
            <header className="parser-header">
                <h1>AI Bet Slip Parser</h1>
                <p>Paste your betting records below and the AI will automatically organize them.</p>
            </header>

            <div className="parser-container">
                <textarea
                    className="input-textarea"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Paste your bet slip here..."
                    rows={10}
                />
                <div className="button-container">
                    <button className="sample-button" onClick={() => setInputText(sampleText)}>Load Sample</button>
                    <button className="parse-button" onClick={handleParse} disabled={isLoading || !inputText.trim()}>
                        {isLoading ? 'Parsing...' : 'Parse'}
                    </button>
                </div>

                {error && <div className="error-message">{error}</div>}

                {parsedData.length > 0 && (
                    <div className="results-container">
                        <h2>Parsing Results</h2>
                        <table className="results-table">
                            <thead>
                                <tr>
                                    <th>Region</th>
                                    <th>Bet Type</th>
                                    <th>Bet Content</th>
                                    <th>Parsed Numbers</th>
                                    <th>Amount/Bet</th>
                                    <th>Source Line</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parsedData.map((item, index) => (
                                    <tr key={index} className={`type-${item.type.replace(/\s/g, '-')}`}>
                                        <td>{item.region}</td>
                                        <td>{item.type}</td>
                                        <td>{item.content}</td>
                                        <td className="numbers-cell">{renderNumbers(item.numbers)}</td>
                                        <td>{item.amount_per_number}</td>
                                        <td className="original-text-cell">{item.original_text}</td>
                                        <td>
                                            <button className="correct-button" onClick={() => handleCorrectClick(item)}>
                                                Correct with AI
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isModalOpen && currentItem && (
                <ChatModal
                    item={currentItem}
                    onClose={handleCloseModal}
                    onCorrect={handleCorrection}
                />
            )}
        </div>
    );
};

export default BetParserPage;