<template>
  <div id="thirteen-water-app">
    <header>
      <h1>十三水在线对战 (核心摆牌模式)</h1>
      <div class="header-info" v-if="gameStore.playerSessionId">
          会话ID: <small>{{ gameStore.playerSessionId.substring(0, 8) }}...</small>
      </div>
    </header>

    <main>
      <div v-if="gameStore.isLoading" class="loading-message">
        正在加载手牌...
      </div>
      <div v-if="gameStore.hasError" class="error-message">
        错误: {{ gameStore.error }}
      </div>

      <!-- PlayerHandInput 现在总是显示，并接收 myCards -->
      <PlayerHandInput 
        v-if="gameStore.myCards && gameStore.myCards.length > 0"
        :initial-cards="gameStore.myCards"
        :is-submitted="handIsSubmitted" 
        @hand-submitted="onHandSubmitted" 
      />
      <div v-else-if="!gameStore.isLoading && !gameStore.hasError">
        <p>未能加载手牌。请尝试刷新。</p>
      </div>
      
      <div v-if="handIsSubmitted" class="submitted-info">
        <p>你的牌型已提交！</p>
        <!-- 这里可以显示已提交的牌墩，如果需要 -->
      </div>

    </main>
    <footer>
      <p>简易十三水游戏 - Vue & PHP</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'; // 移除了 computed, onUnmounted
import { useGameStore } from './stores/gameStore';
import PlayerHandInput from './components/PlayerHandInput.vue'; // 确保这个组件是移除了拖拽的版本

const gameStore = useGameStore();
const handIsSubmitted = ref(false); // 本地状态，标记是否已提交

async function onHandSubmitted(arrangedHands) {
  // arrangedHands 应该包含 { front: [...], mid: [...], back: [...] }
  await gameStore.submitArrangedHand(arrangedHands.front, arrangedHands.mid, arrangedHands.back);
  if (!gameStore.error) {
    handIsSubmitted.value = true;
    // 在简化模式下，提交后可能重新发牌或提示游戏结束
    // 例如： setTimeout(() => { handIsSubmitted.value = false; gameStore.fetchInitialHand(); }, 3000);
  }
}

onMounted(async () => {
    // console.log("[App.vue Simplified] onMounted. Calling fetchInitialHand.");
    await gameStore.fetchInitialHand();
});

</script>

<style>
/* 你可以保留或简化之前的全局样式 */
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #eef2f7; color: #333; line-height: 1.6; }
#thirteen-water-app { max-width: 800px; margin: 20px auto; padding: 20px; background-color: #fff; box-shadow: 0 0 20px rgba(0,0,0,0.05); border-radius: 8px; }
header { border-bottom: 1px solid #ddd; padding-bottom: 15px; margin-bottom: 20px; text-align: center; }
header h1 { color: #007bff; margin: 0; }
.header-info { margin-top: 5px; font-size: 0.9em; color: #555;}
.loading-message, .error-message, .submitted-info { margin-top: 15px; padding: 10px; border-radius: 4px; text-align: center; }
.loading-message { background-color: #cce5ff; color: #004085; border: 1px solid #b8daff;}
.error-message { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;}
.submitted-info { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb;}
footer { margin-top: 30px; text-align: center; font-size: 0.9em; color: #6c757d; }
</style>
