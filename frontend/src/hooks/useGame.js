// frontend/src/hooks/useGame.js
import { useCallback, useEffect } from 'react';
import {
  initialGameState,
  startGame as startGameLogic,
  confirmArrangement,
  compareAllHands,
  GameStates
} from '../logic/gameLogic';
import { arrangeCardsAI as arrangeCardsAILogic } from '../logic/aiLogic';
import {
  evaluateHand as evaluateHandLogic,
  isValidArrangement as isValidArrangementLogic
} from '../logic/cardUtils';
import { t } from '../i18n';
import { useStore } from '../store';

export const useGame = () => {
  const {
    gameState,
    arrangedHumanHand,
    selectedCardsInfo,
    isLoadingApp,
    currentUser,
    setGameState,
    setArrangedHumanHand,
    setShowComparisonModal,
    setSelectedCardsInfo,
    setIsLoadingApp,
  } = useStore();

  const humanPlayerFromState = gameState?.players.find(p => p.isHuman);

  const initializeNewGame = useCallback(async (isCalledAfterAuthOrRestart = false) => {
    console.time("initializeNewGameTotal");
    setSelectedCardsInfo([]);
    setArrangedHumanHand({ tou: [], zhong: [], wei: [] });
    setShowComparisonModal(false);
    let newState = startGameLogic(initialGameState);
    let humanHandForAISuggestion = [];
    console.time("aiAndHumanSetup");
    const playerSetups = newState.players.map(player => {
      if (!player.isHuman) {
        const aiA = arrangeCardsAILogic(player.hand);
        if (aiA && isValidArrangementLogic(aiA.tou, aiA.zhong, aiA.wei)) {
          const eH = { tou: evaluateHandLogic(aiA.tou), zhong: evaluateHandLogic(aiA.zhong), wei: evaluateHandLogic(aiA.wei) };
          return { ...player, arranged: aiA, evalHands: eH, confirmed: true };
        } else {
          const fT = player.hand.slice(0, 3), fZ = player.hand.slice(3, 8), fW = player.hand.slice(8, 13);
          const eA = { tou: [], zhong: [], wei: [] }, eE = { tou: evaluateHandLogic([]), zhong: evaluateHandLogic([]), wei: evaluateHandLogic([]) };
          const fbE = { tou: evaluateHandLogic(fT), zhong: evaluateHandLogic(fZ), wei: evaluateHandLogic(fW) };
          return (fT.length === 3 && fZ.length === 5 && fW.length === 5 && isValidArrangementLogic(fT, fZ, fW)) ? { ...player, arranged: { tou: fT, zhong: fZ, wei: fW }, evalHands: fbE, confirmed: true } : { ...player, arranged: eA, evalHands: eE, confirmed: true };
        }
      } else {
        humanHandForAISuggestion = [...player.hand];
        return player;
      }
    });
    newState.players = playerSetups;
    console.timeEnd("aiAndHumanSetup");
    if (humanHandForAISuggestion.length === 13) {
      const initHumanAI = arrangeCardsAILogic(humanHandForAISuggestion);
      if (initHumanAI && isValidArrangementLogic(initHumanAI.tou, initHumanAI.zhong, initHumanAI.wei)) {
        setArrangedHumanHand(initHumanAI);
      } else {
        setArrangedHumanHand({ tou: humanHandForAISuggestion.slice(0, 3), zhong: humanHandForAISuggestion.slice(3, 8), wei: humanHandForAISuggestion.slice(8, 13) });
      }
    } else {
      setArrangedHumanHand({ tou: [], zhong: [], wei: [] });
    }
    newState.gameState = "HUMAN_ARRANGING";
    setGameState(newState);
    if (isCalledAfterAuthOrRestart || !currentUser) {
      setIsLoadingApp(false);
    }
    console.timeEnd("initializeNewGameTotal");
  }, [currentUser, setArrangedHumanHand, setGameState, setIsLoadingApp, setSelectedCardsInfo, setShowComparisonModal]);

  const handleCloseComparisonModalAndStartNewGame = useCallback(() => {
    setShowComparisonModal(false);
    setIsLoadingApp(true);
    setTimeout(() => {
      setGameState(prev => {
        const scores = new Map(prev.players.map(p => [p.id, p.score]));
        const cleanP = initialGameState.players.map(pI => ({ ...pI, score: scores.get(pI.id) || 0 }));
        return { ...initialGameState, players: cleanP, gameState: GameStates.INIT };
      });
    }, 50);
  }, [setGameState, setIsLoadingApp, setShowComparisonModal]);

  useEffect(() => { // Handles initial load and game resets
    if (gameState?.gameState === GameStates.INIT) {
      if (!isLoadingApp) {
        setIsLoadingApp(true);
      }

      const humanPlayerId = gameState.players.find(p => p.isHuman)?.id;

      if (humanPlayerId) {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
        fetch(`${API_URL}/game.php?action=get_score&user_id=${humanPlayerId}`)
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              // Update the score in the initial state
              setGameState(prev => {
                const updatedPlayers = prev.players.map(p => {
                  if (p.id === humanPlayerId) {
                    return { ...p, score: data.score };
                  }
                  return p;
                });
                return { ...prev, players: updatedPlayers };
              });
            } else {
              console.error('Failed to fetch score:', data.message);
            }
          })
          .catch(error => {
            console.error('Error fetching score:', error);
          })
          .finally(() => {
            const timer = setTimeout(() => {
              initializeNewGame(true);
            }, 0);
            return () => clearTimeout(timer);
          });
      } else {
        const timer = setTimeout(() => {
          initializeNewGame(true);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [gameState?.gameState, initializeNewGame, isLoadingApp, setIsLoadingApp, setGameState]);

  const handleSubmitPlayerHand = useCallback(() => {
    if (!humanPlayerFromState) return;
    const { tou, zhong, wei } = arrangedHumanHand;
    const total = (tou?.length || 0) + (zhong?.length || 0) + (wei?.length || 0);
    if (total !== 13) {
      alert(t(`总牌数需13张,当前%s张`, total));
      return;
    }
    if ((tou?.length || 0) !== 3 || (zhong?.length || 0) !== 5 || (wei?.length || 0) !== 5) {
      alert(t(`墩牌数量错误`));
      return;
    }
    if (!isValidArrangementLogic(tou, zhong, wei)) {
      alert(t("墩牌不合法!"));
      return;
    }
    let stateAfterConfirm = confirmArrangement(gameState, humanPlayerFromState.id, arrangedHumanHand);
    const finalState = compareAllHands(stateAfterConfirm);
    setGameState(finalState);
    setShowComparisonModal(true);

    // Save score to backend
    const humanPlayerResult = finalState.players.find(p => p.isHuman);
    if (humanPlayerResult) {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
      fetch(`${API_URL}/game.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'save_score',
          user_id: humanPlayerResult.id,
          score: humanPlayerResult.score,
        }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          console.log('Score saved successfully.');
        } else {
          console.error('Failed to save score:', data.message);
        }
      })
      .catch(error => {
        console.error('Error saving score:', error);
      });
    }
  }, [humanPlayerFromState, arrangedHumanHand, gameState, setGameState, setShowComparisonModal]);

  const handleAIHelperForHuman = useCallback(() => {
    const humanP = gameState.players.find(p => p.isHuman);
    if (humanP && humanP.hand && humanP.hand.length === 13) {
      const suggestion = arrangeCardsAILogic(humanP.hand);
      if (suggestion && isValidArrangementLogic(suggestion.tou, suggestion.zhong, suggestion.wei)) {
        setArrangedHumanHand(suggestion);
        setSelectedCardsInfo([]);
      } else {
        alert(t("AI未能给出建议。"));
      }
    }
  }, [gameState.players, setArrangedHumanHand, setSelectedCardsInfo]);

  const handleCardClick = useCallback((cardClicked, currentDunOfCard) => {
    setSelectedCardsInfo(prev => {
      const idx = prev.findIndex(i => i.card.id === cardClicked.id);
      return idx > -1 ? prev.filter((_, i) => i !== idx) : [...prev, { card: cardClicked, fromDun: currentDunOfCard }];
    });
  }, [setSelectedCardsInfo]);

  const handleDunClick = useCallback((targetDunName) => {
    if (selectedCardsInfo.length > 0) {
      setArrangedHumanHand(prev => {
        const newA = { tou: [...prev.tou], zhong: [...prev.zhong], wei: [...prev.wei] };
        const addT = [];
        selectedCardsInfo.forEach(sI => {
          if (sI.fromDun && newA[sI.fromDun]) {
            newA[sI.fromDun] = newA[sI.fromDun].filter(c => c.id !== sI.card.id);
          }
          addT.push(sI.card);
        });
        const eIds = new Set(newA[targetDunName].map(c => c.id));
        const uAdd = addT.filter(c => !eIds.has(c.id));
        newA[targetDunName] = [...newA[targetDunName], ...uAdd];
        return newA;
      });
      setSelectedCardsInfo([]);
    }
  }, [selectedCardsInfo, setArrangedHumanHand, setSelectedCardsInfo]);

  return {
    humanPlayerFromState,
    handleCloseComparisonModalAndStartNewGame,
    handleSubmitPlayerHand,
    handleAIHelperForHuman,
    handleCardClick,
    handleDunClick
  };
};
