const API_BASE = "https://wen76674.serv00.net/api.php";
let currentHand = []; // 当前13张牌

// 识别牌 ID 并渲染 SVG
function createCardElement(cardId) {
    const suits = ['clubs', 'diamonds', 'hearts', 'spades'];
    const values = {11:'jack', 12:'queen', 13:'king', 14:'ace'};
    
    const vRaw = ((cardId - 1) % 13) + 2;
    const sIdx = Math.floor((cardId - 1) / 13);
    const vName = vRaw > 10 ? values[vRaw] : vRaw;
    
    const img = document.createElement('img');
    img.src = `./assets/cards/${vName}_of_${suits[sIdx]}.svg`;
    img.className = "w-16 h-24 md:w-20 md:h-28 transition-transform hover:-translate-y-2 cursor-pointer";
    img.dataset.id = cardId;
    
    img.onclick = () => moveCard(cardId);
    return img;
}

// 理牌移动逻辑 (略：点击图片将其从 my-hand 移入 row-0/1/2 容器)