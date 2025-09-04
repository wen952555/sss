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

            (注意: 这只是一个模拟, 点击“确定”后我们未来会连接到后端。)
        `;

        if (confirm(confirmationMessage)) {
            // For now, just show a success message.
            // Later, this is where we would make the API call to the backend.
            alert('投注成功！');
            resetGame();
        }
    }


    // --- Initial Setup and Event Listeners ---

    resetButton.addEventListener('click', resetGame);
    confirmButton.addEventListener('click', confirmBet);

    renderNumberGrid(); // Initial render
});
