document.addEventListener('DOMContentLoaded', () => {
    const dealButton = document.getElementById('dealButton');
    const playerHandDiv = document.getElementById('playerHand');
    const loadingDiv = document.getElementById('loading');
    
    // ⭐ 后端API的URL
    // 确保这里的路径与你 Serv00 部署的 PHP 文件路径一致
    const backendApiUrl = 'http://9525.ip-ddns.com/thirteen_water_api/api.php?action=deal'; 
    // 如果你的Serv00支持HTTPS并且你配置了，那么这里应该用 https
    // const backendApiUrl = 'https://9525.ip-ddns.com/thirteen_water_api/api.php?action=deal';

    // 显示配置信息
    document.getElementById('backendUrlDisplay').textContent = backendApiUrl;


    dealButton.addEventListener('click', fetchAndDisplayHand);

    async function fetchAndDisplayHand() {
        dealButton.disabled = true;
        loadingDiv.style.display = 'block';
        playerHandDiv.innerHTML = ''; // 清空旧牌

        try {
            const response = await fetch(backendApiUrl);
            if (!response.ok) {
                let errorMsg = `HTTP error! status: ${response.status}`;
                try {
                    const errData = await response.json();
                    errorMsg += ` - ${errData.error || 'Unknown server error'}`;
                } catch (e) { /* ignore if response not json */ }
                throw new Error(errorMsg);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(`API Error: ${data.error}`);
            }

            if (data.hand && data.image_base_path) {
                displayCards(data.hand, data.image_base_path);
                document.getElementById('imageBasePathDisplay').textContent = data.image_base_path; // 显示图片路径
            } else {
                throw new Error('Invalid data structure from API.');
            }

        } catch (error) {
            console.error('Error fetching hand:', error);
            playerHandDiv.innerHTML = `<p style="color: red;">加载手牌失败: ${error.message}</p><p>请检查后端API是否正确运行，CORS设置是否正确，以及网络连接。</p>`;
        } finally {
            dealButton.disabled = false;
            loadingDiv.style.display = 'none';
        }
    }

    function displayCards(hand, imageBasePath) {
        hand.forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.classList.add('card');

            const img = document.createElement('img');
            // 拼接完整的图片URL (相对于前端根目录)
            // 例如: images/cards/ace_of_spades.svg
            const imageUrl = `${imageBasePath}${card.image}`;
            img.src = imageUrl;
            img.alt = `${card.value} of ${card.suit}`;
            
            // 处理图片加载失败的情况
            img.onerror = function() {
                cardDiv.innerHTML = `<span class="missing-image-text">${card.value.charAt(0).toUpperCase()}${card.suit.charAt(0).toUpperCase()}<br>(no img)</span>`;
                console.warn(`Image not found: ${imageUrl}`);
            };

            cardDiv.appendChild(img);
            playerHandDiv.appendChild(cardDiv);
        });
    }

    // 初始加载一次 (可选)
    // fetchAndDisplayHand(); 
});
