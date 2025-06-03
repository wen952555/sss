<template>
  <div id="app-container">
    <h1>十三水游戏</h1>

    <div v-if="error" class="error">{{ error }}</div>

    <!-- 连接和房间管理 -->
    <div v-if="!connected">
      <p>正在连接服务器...</p>
    </div>
    <div v-else-if="!roomId">
      <input type="text" v-model="playerName" placeholder="输入你的名字" />
      <button @click="createRoomHandler">创建房间</button>
      <br>
      <input type="text" v-model="joinRoomIdInput" placeholder="输入房间号加入" />
      <button @click="joinRoomHandler">加入房间</button>
    </div>

    <!-- 游戏内 -->
    <div v-else class="game-area">
      <div class="game-info">
        <p>房间号: <strong>{{ roomId }}</strong> | 我的ID: {{ playerId }} ({{ playerName }})</p>
        <p>游戏状态: <strong>{{ gameState.gameState }}</strong></p>
        <button @click="leaveRoom" style="background-color: #f44336;">离开房间</button>
      </div>

      <div class="player-info">
        <h2>玩家列表 ({{ gameState.players?.length || 0 }})</h2>
        <ul class="player-list">
          <li v-for="p in gameState.players" :key="p.id">
            {{ p.name }} ({{ p.id === playerId ? '你' : '' }}) -
            状态: {{ p.isReady ? '已准备' : '未准备' }} -
            得分: {{ p.score }}
          </li>
        </ul>
      </div>

      <div v-if="gameState.gameState === 'waiting' && isRoomHost">
        <button @click="startGameHandler" :disabled="(gameState.players?.length || 0) < 2">
          开始游戏 (至少2人)
        </button>
      </div>

      <!-- 玩家手牌展示和理牌区域 -->
      <div v-if="playerHand.length > 0 && (gameState.gameState === 'playing' || gameState.gameState === 'scoring' || gameState.gameState === 'finished')">
        <h2>我的手牌 (拖拽理牌)</h2>
        <PlayerHandComponent
          title="未分配的牌"
          :cards="unassignedCards"
          :draggableCards="true"
          :droppable="true"
          segmentName="initial"
          @cardDropped="handleCardDrop"
          @cardDragStart="handleCardDragStart"
        />

        <div class="segments">
          <PlayerHandComponent
            title="头墩 (3张)"
            :cards="arrangedHand.front"
            :draggableCards="true"
            :droppable="true"
            segmentName="front"
            @cardDropped="handleCardDrop"
            @cardDragStart="handleCardDragStart"
          />
          <PlayerHandComponent
            title="中墩 (5张)"
            :cards="arrangedHand.middle"
            :draggableCards="true"
            :droppable="true"
            segmentName="middle"
            @cardDropped="handleCardDrop"
            @cardDragStart="handleCardDragStart"
          />
          <PlayerHandComponent
            title="尾墩 (5张)"
            :cards="arrangedHand.back"
            :draggableCards="true"
            :droppable="true"
            segmentName="back"
            @cardDropped="handleCardDrop"
            @cardDragStart="handleCardDragStart"
          />
        </div>

        <button
          v-if="gameState.gameState === 'playing' && !currentPlayerIsReady"
          @click="submitHandHandler"
          :disabled="!isHandArrangementValid()"
        >
          提交牌型 ({{ validationMessage }})
        </button>
        <p v-if="currentPlayerIsReady && gameState.gameState === 'playing'">已提交，等待其他玩家...</p>
      </div>

      <!-- 比牌结果 -->
      <div v-if="showdownResults && (gameState.gameState === 'scoring' || gameState.gameState === 'finished')">
         <h2>比牌结果</h2>
         <div v-for="(data, pId) in showdownResults" :key="pId" class="player-showdown">
             <h4>{{ data.name }} (得分: {{data.score}})</h4>
             <p>头墩:</p>
             <div class="card-container"><CardComponent v-for="c in data.arrangedHand.front" :key="c.id" :card="c"/></div>
             <p>中墩:</p>
             <div class="card-container"><CardComponent v-for="c in data.arrangedHand.middle" :key="c.id" :card="c"/></div>
             <p>尾墩:</p>
             <div class="card-container"><CardComponent v-for="c in data.arrangedHand.back" :key="c.id" :card="c"/></div>
         </div>
         <button v-if="isRoomHost && gameState.gameState === 'finished'" @click="startGameHandler">再来一局</button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, reactive } from 'vue';
import { connectSocket, getSocket, emitPromise } from './services/socketService';
import PlayerHandComponent from './components/PlayerHand.vue';
import CardComponent from './components/Card.vue';

const connected = ref(false);
const socket = ref(null);
const error = ref('');
const playerName = ref(`玩家${Math.floor(Math.random() * 1000)}`);
const playerId = ref('');
const roomId = ref('');
const joinRoomIdInput = ref('');
const gameState = ref({}); // 从服务器获取的完整游戏状态
const playerHand = ref([]); // 玩家自己的手牌
const isRoomHost = ref(false); // 简单判断是否是房主（第一个加入的）

const arrangedHand = reactive({
  front: [],
  middle: [],
  back: []
});
let draggedCardInfo = null; // { card, fromSegment }

const unassignedCards = computed(() => {
  const assignedIds = new Set([
    ...arrangedHand.front.map(c => c.id),
    ...arrangedHand.middle.map(c => c.id),
    ...arrangedHand.back.map(c => c.id)
  ]);
  return playerHand.value.filter(c => !assignedIds.has(c.id));
});

const validationMessage = computed(() => {
   if (arrangedHand.front.length !== 3) return "头墩需3张牌";
   if (arrangedHand.middle.length !== 5) return "中墩需5张牌";
   if (arrangedHand.back.length !== 5) return "尾墩需5张牌";
   if (unassignedCards.value.length > 0) return "还有未分配的牌";
   return "可以提交";
});

const currentPlayerIsReady = computed(() => {
   const me = gameState.value.players?.find(p => p.id === playerId.value);
   return me?.isReady || false;
});

const showdownResults = ref(null);


onMounted(() => {
  socket.value = connectSocket();

  socket.value.on('connect', () => {
    connected.value = true;
    playerId.value = socket.value.id;
  });

  socket.value.on('disconnect', () => {
    connected.value = false;
    error.value = "与服务器断开连接";
    // roomId.value = ''; // Reset room state
    // playerHand.value = [];
  });

  socket.value.on('gameStateUpdate', (newGameState) => {
    gameState.value = newGameState;
    // 更新是否是房主（简陋判断，第一个玩家是房主）
    if (newGameState.players && newGameState.players.length > 0) {
        isRoomHost.value = newGameState.players[0].id === playerId.value;
    }
  });

  socket.value.on('playerHand', (hand) => {
    playerHand.value = hand;
    // 重置已排列的牌
    arrangedHand.front = [];
    arrangedHand.middle = [];
    arrangedHand.back = [];
    showdownResults.value = null; // 清除上一局的比牌结果
  });

  socket.value.on('showdown', (results) => {
     showdownResults.value = results;
  });

});

onUnmounted(() => {
  if (socket.value) {
    socket.value.disconnect();
  }
});

async function createRoomHandler() {
  error.value = '';
  try {
    const response = await emitPromise('createRoom', { playerName: playerName.value });
    roomId.value = response.roomId;
    isRoomHost.value = true; // 创建者是房主
    // gameState.value.players = [response.player]; //  Update local state immediately or wait for gameStateUpdate
  } catch (err) {
    error.value = `创建房间失败: ${err.message}`;
  }
}

async function joinRoomHandler() {
  if (!joinRoomIdInput.value.trim()) {
    error.value = "请输入房间号";
    return;
  }
  error.value = '';
  try {
    const response = await emitPromise('joinRoom', { roomId: joinRoomIdInput.value.toUpperCase(), playerName: playerName.value });
    roomId.value = response.roomId;
    // gameState.value = response.gameState;
    isRoomHost.value = false; // 加入者不是房主 (除非房间只有他一人，但后端逻辑会处理)
  } catch (err) {
    error.value = `加入房间失败: ${err.message}`;
  }
}

async function startGameHandler() {
  error.value = '';
  try {
    await emitPromise('startGame', { roomId: roomId.value });
    // 服务端会广播 gameStateUpdate 和 playerHand
  } catch (err) {
    error.value = `开始游戏失败: ${err.message}`;
  }
}

function leaveRoom() {
     if (socket.value && roomId.value) {
         // 后端会在 disconnect 时处理，也可以主动发一个 'leaveRoom' 事件
         socket.value.disconnect(); // 这会触发服务端的 disconnect 清理
         // 手动重置前端状态
         roomId.value = '';
         playerHand.value = [];
         gameState.value = {};
         arrangedHand.front = [];
         arrangedHand.middle = [];
         arrangedHand.back = [];
         showdownResults.value = null;
         error.value = '已离开房间，请重新连接或创建/加入房间。';
         // 重新连接以便可以创建或加入新房间
         setTimeout(() => {
              socket.value = connectSocket();
              socket.value.on('connect', () => {
                 connected.value = true;
                 playerId.value = socket.value.id;
                 error.value = ''; // 清除离开信息
             });
         }, 500);

     }
 }

function handleCardDragStart(payload) { // payload: { card, fromSegment }
  draggedCardInfo = payload;
}

function handleCardDrop(payload) { // payload: { card (optional, if not from drag event), toSegment }
  if (!draggedCardInfo && !payload.card) return;

  const cardToMove = draggedCardInfo ? draggedCardInfo.card : payload.card;
  const fromSegmentName = draggedCardInfo ? draggedCardInfo.fromSegment : 'initial'; // Assume from initial if not specified
  const toSegmentName = payload.toSegment;

  // 1. 从原位置移除
  if (fromSegmentName === 'initial') {
    // unassignedCards is computed, so we modify playerHand if it was truly initial
    // This logic is tricky because unassigned is derived.
    // A simpler way: just add to target, and unassigned will recompute.
    // However, if we need to remove from specific segment:
  } else if (arrangedHand[fromSegmentName]) {
    const index = arrangedHand[fromSegmentName].findIndex(c => c.id === cardToMove.id);
    if (index > -1) arrangedHand[fromSegmentName].splice(index, 1);
  }


  // 2. 添加到新位置 (如果目标是墩，检查墩的容量)
  const targetSegment = toSegmentName === 'initial' ? null : arrangedHand[toSegmentName]; // 'initial' is not a segment in arrangedHand

  if (targetSegment) { // Moving to front, middle, or back
     let limit = 0;
     if (toSegmentName === 'front') limit = 3;
     else if (toSegmentName === 'middle' || toSegmentName === 'back') limit = 5;

     if (targetSegment.length < limit) {
         // Ensure card isn't already there (in case of bad drag/drop sequence)
         if (!targetSegment.find(c => c.id === cardToMove.id)) {
             targetSegment.push(cardToMove);
         }
     } else {
         // Target segment is full, put it back to 'initial' or original segment
         // This needs more robust handling. For now, we might just not add it.
         // Or, if fromSegment was not 'initial', add it back there.
          console.warn(`Segment ${toSegmentName} is full.`);
          // Re-add to original segment if it was moved from one of the arranged hands
          if (fromSegmentName !== 'initial' && arrangedHand[fromSegmentName]) {
             if (!arrangedHand[fromSegmentName].find(c => c.id === cardToMove.id)) {
                  arrangedHand[fromSegmentName].push(cardToMove); // Put it back
             }
          }
          // If it came from initial and target is full, it effectively stays in initial.
     }
  } else if (toSegmentName === 'initial') {
     // Card is moved to 'unassigned' area.
     // It's already handled by being removed from a segment and unassignedCards is computed.
     // No specific add needed here unless it was from another source.
  }

  // Sort segments for consistent display (optional)
  Object.values(arrangedHand).forEach(segment => segment.sort((a,b) => a.rank - b.rank || SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit)));

  draggedCardInfo = null; // Reset after drop
}

function isHandArrangementValid() {
  return arrangedHand.front.length === 3 &&
         arrangedHand.middle.length === 5 &&
         arrangedHand.back.length === 5 &&
         unassignedCards.value.length === 0;
}

async function submitHandHandler() {
  if (!isHandArrangementValid()) {
    error.value = "牌型不符合要求: " + validationMessage.value;
    return;
  }
  error.value = '';
  try {
    const handToSubmit = {
      front: arrangedHand.front.map(c => ({id: c.id, suit: c.suit, value: c.value})), // Send minimal data
      middle: arrangedHand.middle.map(c => ({id: c.id, suit: c.suit, value: c.value})),
      back: arrangedHand.back.map(c => ({id: c.id, suit: c.suit, value: c.value})),
    };
    await emitPromise('submitHand', { roomId: roomId.value, arrangedHand: handToSubmit });
    // Server will send gameStateUpdate, which will reflect player's ready state
  } catch (err) {
    error.value = `提交牌型失败: ${err.message}`;
  }
}

</script>

<style scoped>
/* App.vue specific styles, if any. Most are in main.css */
.game-area {
  margin-top: 20px;
}
.player-showdown {
     border: 1px solid #eee;
     padding: 10px;
     margin-bottom: 10px;
     background-color: #f9f9f9;
}
</style>
