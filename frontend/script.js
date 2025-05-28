console.log("script.js: CORS_CHECK_DEBUG - 文件开始加载。");

document.addEventListener('DOMContentLoaded', () => {
    // === DOM获取 ===
    const messageArea = document.getElementById('message-area');
    const dealButton = document.getElementById('dealButton');
    const matchButton = document.getElementById('matchButton');
    const resetArrangementButton = document.getElementById('resetArrangementButton');
    const submitButton = document.getElementById('submitButton');
    const aiSuggestButton = document.getElementById('aiSuggestButton');
    const aiAutoButton = document.getElementById('aiAutoButton');
    const aiReleaseButton = document.getElementById('aiReleaseButton');
    const arrangementZones = {
        head: { div: document.getElementById('arranged-head'), countSpan: document.querySelector('.arranged-count[data-lane="head"]'), typeDisplay: document.getElementById('head-type-display'), max: 3 },
        hand: { div: document.getElementById('arranged-hand'), countSpan: document.querySelector('.arranged-count[data-lane="hand"]'), typeDisplay: document.getElementById('hand-type-display'), max: 5 },
        tail: { div: document.getElementById('arranged-tail'), countSpan: document.querySelector('.arranged-count[data-lane="tail"]'), typeDisplay: document.getElementById('tail-type-display'), max: 5 }
    };

    // === 变量 ===
    let originalHandData = [];
    let arrangedCardsData = { head: [], hand: [], tail: [] };
    let selectedCardElement = null;
    let isAIAuto = false;
    let aiAutoRemainRounds = 0;
    let aiStrategyIndex = 0;
    let lastAIMode = 0;
    window.currentUser = null; // {phone: '1xxxxxxxxxx', token: '...'}

    // AI 分牌策略
    const aiDivideStrategies = [
      {
        name: '最优分牌',
        func: function(hand) {
          return simpleAIDivide13(hand);
        }
      },
      {
        name: '均衡分牌',
        func: function(hand) {
          const sorted = [...hand].sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
          return {
            tail: [sorted[0],sorted[3],sorted[6],sorted[9],sorted[12]],
            hand: [sorted[1],sorted[4],sorted[7],sorted[10],sorted[11]],
            head: [sorted[2],sorted[5],sorted[8]]
          };
        }
      },
      {
        name: '花色优先',
        func: function(hand) {
          let suits = {};
          hand.forEach(card => {
            if (!suits[card.suit]) suits[card.suit] = [];
            suits[card.suit].push(card);
          });
          let piles = [[],[],[]];
          let pileIndex = 0;
          Object.values(suits).forEach(cards => {
            for (let c of cards) {
              piles[pileIndex%3].push(c);
              pileIndex++;
            }
          });
          return {
            head: piles[0].slice(0,3),
            hand: piles[1].slice(0,5),
            tail: piles[2].slice(0,5)
          };
        }
      }
    ];

    // === 功能函数 ===
    function renderCardElement(cardData, sourceLane) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        cardDiv.dataset.id = cardData.id;
        cardDiv.dataset.suit = cardData.suit; cardDiv.dataset.rank = cardData.rank;
        const imagePath = getCardImage(cardData);
        cardDiv.style.backgroundImage = `url('${imagePath}')`;
        const cardText = `${cardData.rank.toString().toUpperCase()}${cardData.suit.toString().toUpperCase().charAt(0)}`;
        cardDiv.textContent = cardText;
        cardDiv.style.color = 'transparent';
        if (!isAIAuto) {
          cardDiv.addEventListener('click', (event) => handleZoneCardClick(event, sourceLane));
        } else {
          cardDiv.style.opacity = 0.7; cardDiv.style.cursor = "not-allowed";
        }
        return cardDiv;
    }

    function renderAllZones() {
        // 清空
        Object.values(arrangementZones).forEach(zone => { if(zone.div) zone.div.innerHTML = ''; });
        // 渲染
        for(const lane of ['head','hand','tail']) {
            arrangedCardsData[lane].forEach(card => {
                arrangementZones[lane].div.appendChild(renderCardElement(card, lane));
            });
        }
        updateCountsAndStates();
    }

    function updateCountsAndStates() {
        // 更新计数
        for (const lane in arrangementZones) {
            arrangementZones[lane].countSpan.textContent = arrangedCardsData[lane].length;
        }
        resetArrangementButton.disabled = originalHandData.length === 0 || isAIAuto;
        submitButton.disabled = !(
            arrangedCardsData.head.length === 3 &&
            arrangedCardsData.tail.length === 5 &&
            arrangedCardsData.hand.length === 5
        );
        // 判型
        for (const lane of ['head', 'hand', 'tail']) {
            const cards = arrangedCardsData[lane];
            if ((lane === "head" && cards.length === 3) || ((lane === "tail" || lane === "hand") && cards.length === 5)) {
                arrangementZones[lane].typeDisplay.textContent = getHandType(cards).description;
            } else {
                arrangementZones[lane].typeDisplay.textContent = "";
            }
        }
        // 满足 3+5+5，隐藏“手牌”区
        if (arrangedCardsData.head.length === 3 && arrangedCardsData.tail.length === 5 && arrangedCardsData.hand.length === 5) {
            arrangementZones.hand.div.style.display = "none";
        } else {
            arrangementZones.hand.div.style.display = "";
        }
    }

    function resetGame() {
        arrangedCardsData = { head: [], hand: [], tail: [] };
        selectedCardElement = null;
        isAIAuto = false;
        aiAutoRemainRounds = 0;
        aiAutoButton.style.display = "inline-block";
        aiReleaseButton.style.display = "none";
        Object.values(arrangementZones).forEach(zone => {
            if(zone.div) zone.div.innerHTML = '';
            if(zone.typeDisplay) zone.typeDisplay.textContent = '';
        });
        messageArea.textContent = "请点击“发牌”或“自动匹配”开始。";
        updateCountsAndStates();
    }

    function deal(handArr) {
        originalHandData = handArr.map((card, i) => ({...card, id: card.id || `card-${Date.now()}-${i}`}));
        arrangedCardsData = { head: [], hand: [...originalHandData], tail: [] };
        renderAllZones();
        messageArea.textContent = "请拖动或点击移动牌到头道和尾道。";
    }

    // --- 牌点击移动 ---
    function handleZoneCardClick(event, fromLane) {
        if (isAIAuto) return;
        const cardDiv = event.currentTarget;
        const cardId = cardDiv.dataset.id;
        // 选中未选中：高亮选中
        if (!selectedCardElement || selectedCardElement !== cardDiv) {
            if (selectedCardElement) selectedCardElement.classList.remove('selected-from-hand');
            selectedCardElement = cardDiv;
            cardDiv.classList.add('selected-from-hand');
            messageArea.textContent = `选中 ${cardDiv.dataset.rank}${cardDiv.dataset.suit}，点击目标区放置。`;
            // 高亮可投放区
            Object.entries(arrangementZones).forEach(([lane, zone]) => {
                if (lane !== fromLane && zone.div.style.display !== "none") zone.div.classList.add('can-drop');
            });
        } else {
            // 已选中再次点击：取消
            selectedCardElement.classList.remove('selected-from-hand');
            selectedCardElement = null;
            Object.values(arrangementZones).forEach(zone => zone.div.classList.remove('can-drop'));
            messageArea.textContent = "取消选择。";
        }
    }

    // --- 区域点击投放 ---
    Object.entries(arrangementZones).forEach(([lane, zone]) => {
        zone.div.addEventListener('click', function(){
            if (isAIAuto || !selectedCardElement) return;
            // 不能把牌投放到原区
            const fromLane = selectedCardElement.parentElement.dataset.lane;
            if (lane === fromLane) return;
            // 移动
            const cardId = selectedCardElement.dataset.id;
            const fromArr = arrangedCardsData[fromLane];
            const cardIdx = fromArr.findIndex(c => c.id === cardId);
            if (cardIdx !== -1) {
                const cardObj = fromArr.splice(cardIdx, 1)[0];
                arrangedCardsData[lane].push(cardObj);
                selectedCardElement.classList.remove('selected-from-hand');
                selectedCardElement = null;
                Object.values(arrangementZones).forEach(z => z.div.classList.remove('can-drop'));
                renderAllZones();
                messageArea.textContent = `已将 ${cardObj.rank}${cardObj.suit} 移至${zone.div.querySelector('.zone-title').textContent.split(' ')[0]}。`;
            }
        });
    });

    // --- 重置 ---
    resetArrangementButton.addEventListener('click', () => {
        if(isAIAuto) return;
        arrangedCardsData = { head: [], hand: [...originalHandData], tail: [] };
        selectedCardElement = null;
        renderAllZones();
        messageArea.textContent = "已重置摆牌。";
    });

    // --- 发牌 ---
    dealButton.addEventListener('click', async () => {
        resetGame();
        dealButton.disabled = true;
        messageArea.textContent = "正在获取手牌...";
        const API_BASE_URL = CONFIG.API_BASE_URL;
        const fullApiUrl = `${API_BASE_URL}/deal_cards.php`;
        try {
            const response = await fetch(fullApiUrl);
            if (!response.ok) throw new Error("发牌API错误");
            const data = await response.json();
            if (data && data.success && Array.isArray(data.hand)) {
                deal(data.hand);
            } else {
                messageArea.textContent = (data && data.message) || "手牌数据格式不正确";
            }
        } catch (e) {
            messageArea.textContent = "请求错误: " + e.message;
        }
        dealButton.disabled = false;
    });

    // --- 自动匹配 ---
    matchButton.addEventListener('click', async () => {
        resetGame();
        dealButton.disabled = true; matchButton.disabled = true;
        messageArea.innerHTML = '正在自动匹配玩家，请稍候... <span id="matching-loading"></span>';
        try {
            const API_BASE_URL = CONFIG.API_BASE_URL;
            await new Promise(r=>setTimeout(r, 1000));
            const response = await fetch(`${API_BASE_URL}/match.php`);
            if (!response.ok) throw new Error("匹配失败");
            const data = await response.json();
            if (data && data.success && Array.isArray(data.hand)) {
                deal(data.hand);
                if (data.opponents && Array.isArray(data.opponents)) {
                  messageArea.innerHTML = `已匹配成功！您的对手：${data.opponents.map(o=>o.name).join('、')}`;
                } else messageArea.innerHTML = "已匹配成功！";
            } else {
                messageArea.textContent = (data && data.message) || "匹配失败！";
            }
        } catch (e) {
            messageArea.textContent = "匹配失败：" + e.message;
        }
        dealButton.disabled = false; matchButton.disabled = false;
        const loading = document.getElementById('matching-loading');
        if (loading && loading.parentNode) loading.parentNode.removeChild(loading);
    });

    // --- AI参考/托管 ---
    aiSuggestButton.addEventListener('click', () => {
      if (!originalHandData || originalHandData.length !== 13) {
        messageArea.textContent = "请先发牌。";
        return;
      }
      const strategy = aiDivideStrategies[aiStrategyIndex % aiDivideStrategies.length];
      const aiResult = strategy.func(originalHandData);
      arrangedCardsData = { head: [...aiResult.head], hand: [...aiResult.hand], tail: [...aiResult.tail] };
      renderAllZones();
      messageArea.textContent = `AI参考：${strategy.name}。再次点击切换分牌策略。`;
      aiStrategyIndex++;
    });

    aiAutoButton.addEventListener('click', () => {
      if (!originalHandData || originalHandData.length !== 13) {
        messageArea.textContent = "请先发牌。";
        return;
      }
      document.getElementById('ai-auto-modal').style.display = 'flex';
    });
    document.getElementById('ai-auto-close').onclick = function() {
      document.getElementById('ai-auto-modal').style.display = 'none';
    };
    document.querySelectorAll('.ai-auto-count-btn').forEach(btn => {
      btn.onclick = function() {
        aiAutoRemainRounds = parseInt(btn.dataset.count, 10);
        document.getElementById('ai-auto-modal').style.display = 'none';
        startAIAuto();
      };
    });

    function startAIAuto() {
      isAIAuto = true;
      aiAutoButton.style.display = "none";
      aiReleaseButton.style.display = "inline-block";
      messageArea.textContent = `AI已托管，剩余${aiAutoRemainRounds}局。`;
      runAIAutoForCurrentRound();
    }

    function runAIAutoForCurrentRound() {
      if (!originalHandData || originalHandData.length !== 13) {
        messageArea.textContent = "请先发牌。";
        return;
      }
      const aiResult = aiDivideStrategies[0].func(originalHandData);
      arrangedCardsData = {
        head: [...aiResult.head],
        hand: [...aiResult.hand],
        tail: [...aiResult.tail]
      };
      renderAllZones();
      messageArea.textContent = `AI托管中，本局已自动摆牌。剩余${aiAutoRemainRounds}局。`;
    }

    aiReleaseButton.addEventListener('click', () => {
      isAIAuto = false;
      aiAutoRemainRounds = 0;
      arrangedCardsData = { head: [], hand: [...originalHandData], tail: [] };
      renderAllZones();
      aiAutoButton.style.display = "inline-block";
      aiReleaseButton.style.display = "none";
      messageArea.textContent = "已解除托管，请手动摆牌。";
    });

    // --- 简单AI分牌 ---
    function simpleAIDivide13(hand) {
        const sorted = [...hand].sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
        return {
            tail: sorted.slice(0,5),
            hand: sorted.slice(5,10),
            head: sorted.slice(10,13)
        };
    }

    // --- 提交 ---
    submitButton.addEventListener('click', () => {
      if (arrangedCardsData.head.length === 3 && arrangedCardsData.tail.length === 5 && arrangedCardsData.hand.length === 5) {
        const headType = getHandType(arrangedCardsData.head);
        const handType = getHandType(arrangedCardsData.hand);
        const tailType = getHandType(arrangedCardsData.tail);
        arrangementZones.head.typeDisplay.textContent = headType.description;
        arrangementZones.hand.typeDisplay.textContent = handType.description;
        arrangementZones.tail.typeDisplay.textContent = tailType.description;
        if (
          compareHandType(tailType, handType) >= 0 &&
          compareHandType(handType, headType) >= 0
        ) {
          messageArea.textContent = "牌型摆放合法！";
          // 若托管，自动下一局
          if (isAIAuto && aiAutoRemainRounds > 0) {
            onRoundEnd();
          }
        } else {
          messageArea.textContent = "不合法的摆牌，请调整！";
        }
      }
    });

    function onRoundEnd() {
      aiAutoRemainRounds--;
      if (aiAutoRemainRounds === 0) {
        isAIAuto = false;
        aiAutoButton.style.display = "inline-block";
        aiReleaseButton.style.display = "none";
        messageArea.textContent = "AI托管已结束。";
      } else {
        // 这里应该自动发牌，演示用resetGame+发牌模拟
        resetGame();
        setTimeout(() => {
          dealButton.click(); // 或调用你的自动发牌函数
          setTimeout(() => {
            runAIAutoForCurrentRound();
          }, 400);
        }, 600);
      }
    }

    // ---------------- 注册弹窗逻辑 ----------------
    document.getElementById('show-register-btn').onclick = function() {
      document.getElementById('register-modal').style.display = 'flex';
    };
    document.getElementById('register-close').onclick = function() {
      document.getElementById('register-modal').style.display = 'none';
      document.getElementById('register-msg').textContent = '';
    };
    document.getElementById('register-submit').onclick = async function() {
      const phone = document.getElementById('register-phone').value.trim();
      const pw = document.getElementById('register-pw').value;
      const pw2 = document.getElementById('register-pw-confirm').value;
      const msgDiv = document.getElementById('register-msg');
      msgDiv.textContent = '';
      if (!/^1\d{10}$/.test(phone)) { msgDiv.textContent = '请输入正确的11位手机号'; return; }
      if (pw.length < 6 || pw.length > 32) { msgDiv.textContent = '密码需6-32位'; return; }
      if (pw !== pw2) { msgDiv.textContent = '两次密码输入不一致'; return; }
      try {
        const resp = await fetch(`${CONFIG.API_BASE_URL}/register.php`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ phone, password: pw })
        });
        const data = await resp.json();
        if (data.success) {
          msgDiv.style.color = '#28a745';
          msgDiv.textContent = '注册成功，请登录！';
          window.currentUser = {phone};
          setTimeout(() => {
            document.getElementById('register-modal').style.display = 'none';
            msgDiv.textContent = '';
          }, 1000);
        } else {
          msgDiv.style.color = '#d9534f';
          msgDiv.textContent = data.message || '注册失败';
        }
      } catch (e) {
        msgDiv.style.color = '#d9534f';
        msgDiv.textContent = '网络或服务器错误';
      }
    };

    // ---------------- 积分管理弹窗逻辑 ----------------
    document.getElementById('show-points-btn').onclick = async function() {
      if (!window.currentUser || !window.currentUser.phone) {
        alert('请先登录！');
        return;
      }
      document.getElementById('points-modal').style.display = 'flex';
      document.getElementById('points-msg').textContent = '';
      document.getElementById('friend-info').style.display = 'none';
      try {
        const resp = await fetch(`${CONFIG.API_BASE_URL}/user_points.php?phone=${encodeURIComponent(window.currentUser.phone)}`);
        const data = await resp.json();
        document.getElementById('my-points').textContent = data.success ? data.points : '--';
      } catch {
        document.getElementById('my-points').textContent = '--';
      }
    };
    document.getElementById('points-close').onclick = function() {
      document.getElementById('points-modal').style.display = 'none';
      document.getElementById('points-msg').textContent = '';
      document.getElementById('friend-info').style.display = 'none';
    };
    document.getElementById('search-friend-btn').onclick = async function() {
      const searchPhone = document.getElementById('search-phone').value.trim();
      const msgDiv = document.getElementById('points-msg');
      msgDiv.textContent = '';
      if (!/^1\d{10}$/.test(searchPhone)) { msgDiv.textContent = '请输入正确的11位手机号'; return; }
      try {
        const resp = await fetch(`${CONFIG.API_BASE_URL}/user_points.php?phone=${encodeURIComponent(searchPhone)}`);
        const data = await resp.json();
        if (data.success) {
          document.getElementById('friend-info').style.display = '';
          document.getElementById('friend-nick').textContent = data.nickname || searchPhone;
          document.getElementById('friend-points').textContent = data.points;
          document.getElementById('give-points-num').value = '';
          document.getElementById('give-points-btn').dataset.friendPhone = searchPhone;
        } else {
          document.getElementById('friend-info').style.display = 'none';
          msgDiv.textContent = data.message || '未找到该用户';
        }
      } catch {
        document.getElementById('friend-info').style.display = 'none';
        msgDiv.textContent = '网络错误';
      }
    };
    document.getElementById('give-points-btn').onclick = async function() {
      const friendPhone = this.dataset.friendPhone;
      const points = parseInt(document.getElementById('give-points-num').value, 10);
      const msgDiv = document.getElementById('points-msg');
      msgDiv.textContent = '';
      if (!points || points < 1) { msgDiv.textContent = '请输入正确的积分数'; return; }
      try {
        const resp = await fetch(`${CONFIG.API_BASE_URL}/give_points.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: window.currentUser.phone,
            to: friendPhone,
            points: points
          })
        });
        const data = await resp.json();
        if (data.success) {
          msgDiv.style.color = '#28a745';
          msgDiv.textContent = '赠送成功！';
          const selfResp = await fetch(`${CONFIG.API_BASE_URL}/user_points.php?phone=${encodeURIComponent(window.currentUser.phone)}`);
          const selfData = await selfResp.json();
          document.getElementById('my-points').textContent = selfData.success ? selfData.points : '--';
        } else {
          msgDiv.style.color = '#d9534f';
          msgDiv.textContent = data.message || '赠送失败';
        }
      } catch {
        msgDiv.style.color = '#d9534f';
        msgDiv.textContent = '网络错误';
      }
    };

    // ====== 比牌相关 ======
    function getCompareData() {
      // 自己
      const me = {
        name: '我',
        piles: [arrangedCardsData.head, arrangedCardsData.hand, arrangedCardsData.tail], // 3,5,5
        totalScore: 6
      };
      // 假设3个对手（演示用静态假数据，实际请从接口获取）
      const others = [
        {
          name: '玩家A',
          piles: [arrangedCardsData.head, arrangedCardsData.hand, arrangedCardsData.tail],
          score: -2
        },
        {
          name: '玩家B',
          piles: [arrangedCardsData.head, arrangedCardsData.hand, arrangedCardsData.tail],
          score: 3
        },
        {
          name: '玩家C',
          piles: [arrangedCardsData.head, arrangedCardsData.hand, arrangedCardsData.tail],
          score: 5
        }
      ];
      return { me, others };
    }

    document.getElementById('start-compare-btn').onclick = function() {
      const compareData = getCompareData();
      renderComparePiles('my-piles', compareData.me.piles);
      document.getElementById('my-total-score').textContent = `总分：${compareData.me.totalScore >= 0 ? '+' : ''}${compareData.me.totalScore}`;
      for (let i = 0; i < 3; ++i) {
        document.getElementById(`player${i+1}-name`).textContent = compareData.others[i].name;
        document.getElementById(`player${i+1}-score`).textContent = `${compareData.others[i].score >= 0 ? '+' : ''}${compareData.others[i].score}`;
        renderComparePiles(`player${i+1}-piles`, compareData.others[i].piles);
      }
      document.getElementById('compare-modal').style.display = 'flex';
    };
    document.getElementById('compare-close').onclick = function() {
      document.getElementById('compare-modal').style.display = 'none';
    };

    function renderComparePiles(containerId, piles) {
      const container = document.getElementById(containerId);
      container.innerHTML = '';
      for (const pile of piles) {
        const row = document.createElement('div');
        row.className = 'compare-pile-row';
        for (const card of pile) {
          const c = document.createElement('div');
          c.className = 'compare-card';
          c.textContent = `${card.rank || '?'}${card.suit || '?'}`;
          row.appendChild(c);
        }
        container.appendChild(row);
      }
    }

    // --- 启动 ---
    resetGame();
});
console.log("script.js: CORS_CHECK_DEBUG - 文件加载结束。");
