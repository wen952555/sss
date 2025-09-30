import React, { useState, useEffect } from 'react';
import ChatModal from '../components/ChatModal';
import { API_BASE_URL } from '../config';
import './BetParserPage.css';

const BetParserPage = () => {
    const [inputText, setInputText] = useState('');
    const [parsedData, setParsedData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const [unprocessedEmails, setUnprocessedEmails] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);

    const sampleText = "香港：10, 22, 34, 46, 鼠, 马, 红波 各 5元\n澳门: 01-10, 单, 大 各 10块\n15.27.39各2元";

    // Fetch unprocessed emails on component mount
    useEffect(() => {
        const fetchEmails = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/get_unprocessed_emails.php`);
                const result = await response.json();
                if (result.success) {
                    setUnprocessedEmails(result.data);
                }
            } catch (e) {
                console.error("Failed to fetch emails:", e);
            }
        };
        fetchEmails();
    }, []);

    const handleClear = () => {
        setInputText('');
        setParsedData([]);
        setError(null);
    };

    const handleParse = async (textToParse, emailId = null) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/api/bet_parser.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToParse, email_id: emailId }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || `HTTP error! status: ${response.status}`);
            setParsedData(data);

            // If an email was parsed, remove it from the list
            if (emailId) {
                setUnprocessedEmails(prev => prev.filter(email => email.id !== emailId));
            }
        } catch (e) {
            setError(`解析失败: ${e.message}`);
            setParsedData([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleParseEmail = (email) => {
        // A simple heuristic to find the main content of the email
        const emailBody = email.raw_content.split(/(\r\n\r\n|\n\n)/)[2] || email.raw_content;
        setInputText(emailBody);
        handleParse(emailBody, email.id);
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
        if (!numbers || numbers.length === 0) return '不适用';
        if (numbers.length > 10) return `${numbers.slice(0, 10).join(', ')}... (共${numbers.length}个)`;
        return numbers.join(', ');
    };

    return (
        <div className="bet-parser-page">
            <header className="parser-header">
                <h1>AI下注单解析器</h1>
                <p>请在下方粘贴您的投注记录，或处理收到的邮件。</p>
            </header>

            {unprocessedEmails.length > 0 && (
                <div className="email-container">
                    <h2>未处理的邮件</h2>
                    <ul className="email-list">
                        {unprocessedEmails.map(email => (
                            <li key={email.id} className="email-item">
                                <div className="email-info">
                                    <span>来自: {email.from_address}</span>
                                    <span>收到时间: {new Date(email.created_at).toLocaleString()}</span>
                                </div>
                                <button className="parse-email-button" onClick={() => handleParseEmail(email)} disabled={isLoading}>
                                    解析邮件
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="parser-container">
                <textarea
                    className="input-textarea"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="请在此处粘贴您的投注单，或点击上方的“解析邮件”..."
                    rows={10}
                />
                <div className="button-container">
                    <button className="sample-button" onClick={() => setInputText(sampleText)}>加载示例</button>
                    <button className="clear-button" onClick={handleClear}>清空</button>
                    <button className="parse-button" onClick={() => handleParse(inputText)} disabled={isLoading || !inputText.trim()}>
                        {isLoading ? '解析中...' : '手动解析'}
                    </button>
                </div>

                {error && <div className="error-message">{error}</div>}

                {parsedData.length > 0 && (
                    <div className="results-container">
                        <h2>解析结果</h2>
                        <table className="results-table">
                            <thead>
                                <tr>
                                    <th>地区</th>
                                    <th>投注类型</th>
                                    <th>投注内容</th>
                                    <th>解析出的号码</th>
                                    <th>每注金额</th>
                                    <th>来源行</th>
                                    <th>操作</th>
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
                                                使用AI纠正
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