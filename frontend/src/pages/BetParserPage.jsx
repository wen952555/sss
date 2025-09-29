import React, { useState } from 'react';
import './BetParserPage.css';

const BetParserPage = () => {
    const [inputText, setInputText] = useState('');
    const [parsedData, setParsedData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // A sample text to help users get started
    const sampleText = "澳门:04.16.28.40.02.14.26.38.13.01.25.37.49.06.18.30.42.23.35.03各5块\n香港：10.22.34.46.04.16.28.40.02.14.26.38.13.25.37.01.23.35.15.27各5块\n鼠马各数5元\n06-36各5元";

    const handleParse = async () => {
        setIsLoading(true);
        setError(null);
        // Do not clear old data until new data arrives, for better UX
        // setParsedData([]);

        try {
            // Pointing to the new PHP backend endpoint
            const response = await fetch('/api/bet_parser.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: inputText }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            setParsedData(data);
        } catch (e) {
            setError(`解析失败: ${e.message}`);
            setParsedData([]); // Clear data on error
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bet-parser-page">
            <header className="parser-header">
                <h1>AI 下注单解析器</h1>
                <p>将下注记录粘贴到下面的文本框中，然后点击“解析”按钮。</p>
            </header>

            <div className="parser-container">
                <textarea
                    className="input-textarea"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="在此处粘贴下注单文本..."
                    rows={12}
                />
                <div className="button-container">
                    <button
                        className="sample-button"
                        onClick={() => setInputText(sampleText)}
                    >
                        加载示例
                    </button>
                    <button
                        className="parse-button"
                        onClick={handleParse}
                        disabled={isLoading || !inputText.trim()}
                    >
                        {isLoading ? '解析中...' : '解析'}
                    </button>
                </div>


                {error && <div className="error-message">{error}</div>}

                {parsedData.length > 0 && (
                    <div className="results-container">
                        <h2>解析结果</h2>
                        <table className="results-table">
                            <thead>
                                <tr>
                                    <th>原始文本</th>
                                    <th>地区</th>
                                    <th>类型</th>
                                    <th>内容/号码</th>
                                    <th>金额/每注</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parsedData.map((item, index) => (
                                    <tr key={index} className={`type-${item.type}`}>
                                        <td>{item.original_text}</td>
                                        <td>{item.region}</td>
                                        <td>{item.type}</td>
                                        <td>
                                            {item.numbers && item.numbers.length > 8 ?
                                                `${item.numbers.slice(0, 8).join(', ')}... (${item.numbers.length}个)` :
                                                (item.numbers && item.numbers.length > 0 ? item.numbers.join(', ') : item.content)
                                            }
                                        </td>
                                        <td>{item.amount_per_number}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BetParserPage;