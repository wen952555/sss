document.addEventListener('DOMContentLoaded', () => {
    // Check if we are on the betting page by looking for the number-grid element
    const numberGrid = document.getElementById('number-grid');
    if (!numberGrid) {
        // We are not on the betting page, do nothing.
        return;
    }

    const selectedNumbersDisplay = document.getElementById('selected-numbers-display');
    const betAmountInput = document.getElementById('bet-amount');
    const resetButton = document.getElementById('reset-button');
    const confirmButton = document.getElementById('confirm-button');

    const MAX_SELECTED_NUMBERS = 7;
    let selectedNumbers = new Set();

    // --- Functions ---

    function renderNumberGrid() {
        numberGrid.innerHTML = '';
        for (let i = 1; i <= 49; i++) {
            const ball = document.createElement('div');
            ball.classList.add('number-ball');
            ball.textContent = i.toString().padStart(2, '0');
            ball.dataset.number = i;

            if (selectedNumbers.has(i)) {
                ball.classList.add('selected');
            }

            ball.addEventListener('click', () => handleBallClick(i, ball));
            numberGrid.appendChild(ball);
        }
    }

    function updateSelectedNumbersDisplay() {
        const sortedNumbers = Array.from(selectedNumbers).sort((a, b) => a - b);
        if (sortedNumbers.length > 0) {
            selectedNumbersDisplay.textContent = sortedNumbers.join(', ');
        } else {
            selectedNumbersDisplay.textContent = '无';
        }
    }

    function handleBallClick(number, ballElement) {
        if (selectedNumbers.has(number)) {
            selectedNumbers.delete(number);
            ballElement.classList.remove('selected');
        } else {
            if (selectedNumbers.size < MAX_SELECTED_NUMBERS) {
                selectedNumbers.add(number);
                ballElement.classList.add('selected');
            } else {
                alert(`您最多只能选择 ${MAX_SELECTED_NUMBERS} 个号码。`);
            }
        }
        updateSelectedNumbersDisplay();
    }

    function resetGame() {
        selectedNumbers.clear();
        betAmountInput.value = '';
        renderNumberGrid();
        updateSelectedNumbersDisplay();
    }

    async function handleBetSubmission() {
        const betData = {
            player_id: "user123", // Placeholder player ID
            numbers: Array.from(selectedNumbers),
            amount: betAmountInput.value
        };

        try {
            // Disable button to prevent multiple submissions
            confirmButton.disabled = true;
            confirmButton.textContent = '提交中...';

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
                // Show a more specific error from the API if available
                alert(`投注失败: ${result.message || '未知错误'}`);
            }
        } catch (error) {
            console.error('Error submitting bet:', error);
            alert('投注请求失败，请检查网络连接或联系管理员。');
        } finally {
            // Re-enable button
            confirmButton.disabled = false;
            confirmButton.textContent = '确认下注';
        }
    }

    function confirmBet() {
        const betAmount = betAmountInput.value;
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
    }


    // --- Initial Setup and Event Listeners ---

    resetButton.addEventListener('click', resetGame);
    confirmButton.addEventListener('click', confirmBet);

    renderNumberGrid(); // Initial render
});
