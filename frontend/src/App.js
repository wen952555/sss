// frontend_react/src/App.js
import React, { useEffect, useCallback } from 'react';
import TopInfoBar from './components/TopInfoBar';
import HumanPlayerBoard from './components/HumanPlayerBoard';
import ActionButtons from './components/ActionButtons';
import ComparisonModal from './components/ComparisonModal';
import { useGame } from './hooks/useGame';
import { GameStates } from './logic/gameLogic';
import { t } from './i18n';
import { useStore } from './store';
import './App.css';

const GameStateDisplayNames = {
  [GameStates.INIT]: t("正在准备游戏..."),
  HUMAN_ARRANGING: t("请您调整牌型"),
  [GameStates.RESULTS]: t("查看结果"),
};

function App() {
  const {
    gameState,
    arrangedHumanHand,
    showComparisonModal,
    selectedCardsInfo,
    isLoadingApp,
  } = useStore();

  const {
    humanPlayerFromState,
    handleCloseComparisonModalAndStartNewGame,
    handleSubmitPlayerHand,
    handleAIHelperForHuman,
    handleCardClick,
    handleDunClick
  } = useGame();

  const handleToggleAIPlay = useCallback(() => { console.log("AI托管 Clicked (TODO)"); }, []);

  if (isLoadingApp) { return <div className="app-loading">{t("请稍候，应用正在加载...")}</div>; }

  const currentStatusText = GameStateDisplayNames[gameState?.gameState] || t("进行中...");
  const playerNames = gameState?.players.map(p => p.name).join('、');
  const canSubmitGame = !!(arrangedHumanHand?.tou && arrangedHumanHand?.zhong && arrangedHumanHand?.wei && (arrangedHumanHand.tou.length + arrangedHumanHand.zhong.length + arrangedHumanHand.wei.length) === 13);

  if (humanPlayerFromState && (gameState.gameState === "HUMAN_ARRANGING") && !showComparisonModal) {
    return (
      <div className="app-container">
        <TopInfoBar statusText={currentStatusText} playerNames={playerNames} />
        <div className="game-content-area">
          <HumanPlayerBoard arrangedHand={arrangedHumanHand} selectedCardsInfo={selectedCardsInfo} onCardClick={handleCardClick} onDunClick={handleDunClick}/>
        </div>
        <ActionButtons 
            onAIHelper={handleAIHelperForHuman} onSubmit={handleSubmitPlayerHand} canSubmit={canSubmitGame} 
            onManageProfile={() => {}} onToggleAIPlay={handleToggleAIPlay}
        />
      </div>
    );
  }
  if (showComparisonModal) { return (<ComparisonModal players={gameState.players} onClose={handleCloseComparisonModalAndStartNewGame} isLoading={isLoadingApp} />); }
  
  return <div className="app-loading">{t("正在准备游戏界面... (%s)", gameState?.gameState)}</div>;
}

export default App;
