document.addEventListener('DOMContentLoaded', () => {
    const resultsContainer = document.getElementById('results-container');

    async function fetchResults() {
        try {
            // We will add the 'get_results' action to game.php in the next step
            const response = await fetch('/api/game.php?action=get_results');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.data.length > 0) {
                renderResults(data.data);
            } else if (data.success && data.data.length === 0) {
                resultsContainer.innerHTML = '<p>暂无开奖记录。</p>';
            } else {
                throw new Error(data.message || 'Failed to load results.');
            }
        } catch (error) {
            console.error('Error fetching results:', error);
            resultsContainer.innerHTML = `<p class="error">无法加载开奖记录。请稍后再试。</p>`;
        }
    }

    function renderResults(results) {
        // Clear loading message
        resultsContainer.innerHTML = '';

        // Sort results from newest to oldest
        results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const resultList = document.createElement('ul');
        resultList.className = 'results-list';

        results.forEach(round => {
            const listItem = document.createElement('li');
            listItem.className = 'result-item';

            const winningNumbers = JSON.parse(round.winning_numbers).join(', ');
            const roundDate = new Date(round.created_at).toLocaleString('zh-CN');

            listItem.innerHTML = `
                <div class="result-item-header">
                    <strong>第 ${round.id} 期</strong>
                </div>
                <div class="result-item-body">
                    <p>开奖时间: ${roundDate}</p>
                    <p>中奖号码: <span class="winning-numbers">${winningNumbers}</span></p>
                </div>
            `;
            resultList.appendChild(listItem);
        });

        resultsContainer.appendChild(resultList);
    }

    // --- Initial Fetch ---
    fetchResults();
});
