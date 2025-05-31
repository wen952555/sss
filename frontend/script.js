document.addEventListener('DOMContentLoaded', () => {
    const playerHandDiv = document.getElementById('playerHand');
    const dealButton = document.getElementById('dealButton');
    const recognitionResultDiv = document.getElementById('recognitionResult');
    const checkBackendButton = document.getElementById('checkBackendButton');
    const backendStatusDiv = document.getElementById('backendStatus');

    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    const rankValues = { // 用于牌值比较 (十三水A最大)
        '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
        'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
    };
    const suitSymbols = { // 用于显示
        'hearts': '♥', 'diamonds': '♦', 'clubs': '♣', 'spades': '♠'
    };
    const rankDisplays = { // 用于显示
        'jack': 'J', 'queen': 'Q', 'king': 'K', 'ace': 'A'
    };

    let deck = [];

    function createDeck() {
        deck = [];
        for (const suit of suits) {
            for (const rank of ranks) {
                // 文件名规则: rank_of_suit.svg
                // e.g., 10_of_clubs.svg, ace_of_spades.svg
                const imageName = `${rank}_of_${suit}.svg`;
                deck.push({
                    suit: suit,
                    rank: rank,
                    value: rankValues[rank],
                    imageName: imageName,
                    displaySuit: suitSymbols[suit],
                    displayRank: rankDisplays[rank] || rank.toUpperCase()
                });
            }
        }
        return deck;
    }

    function shuffleDeck(deckToShuffle) {
        for (let i = deckToShuffle.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deckToShuffle[i], deckToShuffle[j]] = [deckToShuffle[j], deckToShuffle[i]];
        }
    }

    function dealCards(deckToDeal, numCards) {
        return deckToDeal.slice(0, numCards);
    }

    function displayCards(cards, container) {
        container.innerHTML = ''; // 清空之前的内容
        cards.forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.classList.add('card');
            const img = document.createElement('img');
            // 假设图片在 'cards/' 目录下
            img.src = `cards/${card.imageName}`;
            img.alt = `${card.displayRank}${card.displaySuit}`;
            img.title = `${card.displayRank}${card.displaySuit} (${card.imageName})`; // 鼠标悬浮提示
            cardDiv.appendChild(img);
            container.appendChild(cardDiv);
        });
    }

    /**
     * 核心：根据文件名识别扑克牌信息
     * @param {string} filename - 例如 "10_of_clubs.svg"
     * @returns {object|null} - 牌信息对象或null（如果无法识别）
     */
    function getCardInfoFromFilename(filename) {
        if (!filename.endsWith('.svg')) return null;

        const nameWithoutExtension = filename.slice(0, -4); // "10_of_clubs"
        const parts = nameWithoutExtension.split('_of_'); // ["10", "clubs"]

        if (parts.length !== 2) return null;

        const rankStr = parts[0]; // "10", "ace", "king"
        const suitStr = parts[1]; // "clubs", "spades"

        if (!ranks.includes(rankStr) || !suits.includes(suitStr)) {
            return null; // 无效的牌面或花色
        }

        return {
            originalFilename: filename,
            suit: suitStr,
            rank: rankStr,
            value: rankValues[rankStr],
            displaySuit: suitSymbols[suitStr],
            displayRank: rankDisplays[rankStr] || rankStr.toUpperCase(),
            imageName: filename // 保留原始文件名，因为我们是从它来的
        };
    }

    function runRecognitionTest() {
        const testFilenames = [
            '10_of_clubs.svg',
            'ace_of_spades.svg',
            'king_of_diamonds.svg',
            'queen_of_hearts.svg',
            'jack_of_spades.svg',
            '2_of_clubs.svg',
            'invalid_card.jpg', // 测试无效文件名
            'joker.svg' // 测试不存在的牌
        ];

        recognitionResultDiv.innerHTML = '<h3>文件名识别结果:</h3><ul>';
        testFilenames.forEach(filename => {
            const cardInfo = getCardInfoFromFilename(filename);
            if (cardInfo) {
                recognitionResultDiv.innerHTML += `<li>${filename} => ${cardInfo.displayRank}${cardInfo.displaySuit} (值: ${cardInfo.value})</li>`;
            } else {
                recognitionResultDiv.innerHTML += `<li>${filename} => 无法识别</li>`;
            }
        });
        recognitionResultDiv.innerHTML += '</ul>';
    }


    dealButton.addEventListener('click', () => {
        createDeck();
        shuffleDeck(deck);
        const playerCards = dealCards(deck, 13);
        displayCards(playerCards, playerHandDiv);
    });

    checkBackendButton.addEventListener('click', async () => {
        backendStatusDiv.textContent = '后端状态: 连接中...';
        try {
            // 使用 config.js 中定义的 API_ENDPOINT_STATUS
            const response = await fetch(API_ENDPOINT_STATUS); // 或使用 API_ENDPOINT_GAME
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json(); // 假设后端返回JSON
            backendStatusDiv.textContent = `后端状态: 已连接 - 消息: ${data.message || JSON.stringify(data)}`;
            backendStatusDiv.style.color = 'green';
        } catch (error) {
            backendStatusDiv.textContent = `后端状态: 连接失败 - ${error.message}`;
            backendStatusDiv.style.color = 'red';
            console.error('Error fetching from backend:', error);
        }
    });

    // 初始化时运行一次识别测试
    runRecognitionTest();
    // 初始发牌 (可选)
    // dealButton.click();
});
