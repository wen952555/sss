import React, { useState, useEffect } from 'react';
import './BettingPage.css';

const BettingPage = () => {
    const [selectedNumbers, setSelectedNumbers] = useState(new Set());
    const [betAmount, setBetAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const MAX_SELECTED_NUMBERS = 7;

    const handleBallClick = (number) => {
        const newSelectedNumbers = new Set(selectedNumbers);
        if (newSelectedNumbers.has(number)) {
            newSelectedNumbers.delete(number);
        } else {
            if (newSelectedNumbers.size < MAX_SELECTED_NUMBERS) {
                newSelectedNumbers.add(number);
            } else {
                alert(`您最多只能选择 ${MAX_SELECTED_NUMBERS} 个号码。`);
            }
        }
        setSelectedNumbers(newSelectedNumbers);
    };

    const resetGame = () => {
        setSelectedNumbers(new Set());
        setBetAmount('');
    };

    const handleBetSubmission = async () => {
        const betData = {
            player_id: "user123", // Placeholder player ID
            numbers: Array.from(selectedNumbers),
            amount: betAmount
        };

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/bet.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(betData),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                alert('投注成功！');
                resetGame();
            } else {
                alert(`投注失败: ${result.message || '未知错误'}`);
            }
        } catch (error) {
            console.error('Error submitting bet:', error);
            alert('投注请求失败，请检查网络连接或联系管理员。');
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmBet = () => {
        if (selectedNumbers.size === 0) {
            alert('请至少选择一个号码。');
            return;
        }
        if (!betAmount || betAmount <= 0) {
            alert('请输入有效的投注金额。');
            return;
        }

        const confirmationMessage = `
            投注确认:
            - 号码: ${Array.from(selectedNumbers).sort((a, b) => a - b).join(', ')}
            - 金额: ${betAmount}
        `;

        if (confirm(confirmationMessage)) {
            handleBetSubmission();
        }
    };

    const renderNumberGrid = () => {
        const balls = [];
        for (let i = 1; i <= 49; i++) {
            balls.push(
                <div
                    key={i}
                    className={`number-ball ${selectedNumbers.has(i) ? 'selected' : ''}`}
                    onClick={() => handleBallClick(i)}
                >
                    {i.toString().padStart(2, '0')}
                </div>
            );
        }
        return balls;
    };

    return (
        <div className="betting-container">
            <h1>选码下注</h1>
            <div id="number-grid" className="number-grid">
                {renderNumberGrid()}
            </div>
            <div className="controls">
                <div className="selected-numbers">
                    已选号码: <span id="selected-numbers-display">{selectedNumbers.size > 0 ? Array.from(selectedNumbers).sort((a, b) => a - b).join(', ') : '无'}</span>
                </div>
                <input
                    type="number"
                    id="bet-amount"
                    className="bet-amount-input"
                    placeholder="输入金额"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                />
                <button id="reset-button" onClick={resetGame} className="control-button">重置</button>
                <button id="confirm-button" onClick={confirmBet} disabled={isSubmitting} className="control-button confirm">
                    {isSubmitting ? '提交中...' : '确认下注'}
                </button>
            </div>
        </div>
    );
};

export default BettingPage;
