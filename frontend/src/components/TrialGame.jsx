// frontend/src/components/TrialGame.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Hand from './Hand';
import Results from './Results';
import { sortHand } from '../utils/cardUtils';
import {
    dealCards,
    evaluate5CardHand,
    evaluate3CardHand,
    isValidHand,
    compareEvaluatedHands,
} from '../utils/gameLogic';
import { getAIArrangedHand } from '../utils/aiPlayer';
import { findBestArrangement } from '../utils/smartArrange';
import './Game.css';

const createEmptyHands = () => ({ front: [], middle: [], back: [] });

const TrialGame = () => {
    const [players, setPlayers] = useState([]);
    const [arrangedHands, setArrangedHands] = useState(createEmptyHands());
    const [selectedCard, setSelectedCard] = useState(null);
    const [gameState, setGameState] = useState('playing');
    const [gameResult, setGameResult] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const allCards = dealCards();
        const humanPlayerHand = sortHand(allCards.player1);
        const humanPlayer = { id: 'human', name: '您', hand: humanPlayerHand };
        const aiPlayers = [
            { id: 'ai1', name: '电脑玩家 1', hand: allCards.player2 },
            { id: 'ai2', name: '电脑玩家 2', hand: allCards.player3 },
            { id: 'ai3', name: '电脑玩家 3', hand: allCards.player4 },
        ];

        setArrangedHands({
            front: humanPlayerHand.slice(0, 3),
            middle: humanPlayerHand.slice(3, 8),
            back: humanPlayerHand.slice(8, 13),
        });
        setPlayers([humanPlayer, ...aiPlayers]);
    }, []);

    const handleCardClick = (clickedCard, clickedHandName) => {
        // If no card is selected, select the clicked card.
        if (!selectedCard) {
            setSelectedCard({ card: clickedCard, source: clickedHandName });
            return;
        }

        // If the same card is clicked again, deselect it.
        if (selectedCard.card.rank === clickedCard.rank && selectedCard.card.suit === clickedCard.suit) {
            setSelectedCard(null);
            return;
        }

        // If a different card is clicked, perform a swap.
        const sourceHandName = selectedCard.source;
        const targetHandName = clickedHandName;

        const newArrangedHands = { ...arrangedHands };

        // Find and remove the selected card from the source hand.
        const sourceHand = newArrangedHands[sourceHandName];
        const cardA_index = sourceHand.findIndex(c => c.rank === selectedCard.card.rank && c.suit === selectedCard.card.suit);

        // Find and remove the clicked card from the target hand.
        const targetHand = newArrangedHands[targetHandName];
        const cardB_index = targetHand.findIndex(c => c.rank === clickedCard.rank && c.suit === clickedCard.suit);

        // Swap the cards.
        sourceHand[cardA_index] = clickedCard;
        targetHand[cardB_index] = selectedCard.card;

        // Update the state with the new hands and deselect the card.
        setArrangedHands({
            front: sortHand(newArrangedHands.front),
            middle: sortHand(newArrangedHands.middle),
            back: sortHand(newArrangedHands.back),
        });
        setSelectedCard(null);
    };

    const handleClearHands = () => {
        // Find the human player's original hand and reset the arrangement
        const humanPlayer = players.find(p => p.id === 'human');
        if (humanPlayer) {
            setArrangedHands({
                front: humanPlayer.hand.slice(0, 3),
                middle: humanPlayer.hand.slice(3, 8),
                back: humanPlayer.hand.slice(8, 13),
            });
        }
        setSelectedCard(null);
        setError('');
    };

    const handleSmartArrange = () => {
        const allCards = [...arrangedHands.front, ...arrangedHands.middle, ...arrangedHands.back];
        if (allCards.length !== 13) return; // Should not happen

        const bestArrangement = findBestArrangement(allCards);
        if (bestArrangement) {
            setArrangedHands(bestArrangement);
            setError('');
        } else {
            setError("无法找到有效的理牌方案。");
        }
    };

    const handleSubmitHand = () => {
        if (!isValidHand(arrangedHands.front, arrangedHands.middle, arrangedHands.back)) return setError("您摆的牌型不符合规则（倒水），请重新摆牌。");

        const submittedHands = { human: arrangedHands };
        players.slice(1).forEach(ai => {
            submittedHands[ai.id] = getAIArrangedHand(ai.hand);
        });

        const playerIds = Object.keys(submittedHands);
        const evals = {};
        playerIds.forEach(id => {
            const { front, middle, back } = submittedHands[id];
            evals[id] = {
                front: evaluate3CardHand(front),
                middle: evaluate5CardHand(middle),
                back: evaluate5CardHand(back),
            };
        });

        const finalScores = playerIds.reduce((acc, id) => ({ ...acc, [id]: { total: 0, special: null, comparisons: {} } }), {});

        for (let i = 0; i < playerIds.length; i++) {
            for (let j = i + 1; j < playerIds.length; j++) {
                const p1_id = playerIds[i];
                const p2_id = playerIds[j];
                let p1_total_score_vs_p2 = 0;
                ['front', 'middle', 'back'].forEach(segment => {
                    const comparison = compareEvaluatedHands(evals[p1_id][segment], evals[p2_id][segment]);
                    if (comparison > 0) p1_total_score_vs_p2++;
                    else if (comparison < 0) p1_total_score_vs_p2--;
                });
                finalScores[p1_id].total += p1_total_score_vs_p2;
                finalScores[p2_id].total -= p1_total_score_vs_p2;
                finalScores[p1_id].comparisons[p2_id] = p1_total_score_vs_p2;
                finalScores[p2_id].comparisons[p1_id] = -p1_total_score_vs_p2;
            }
        }

        const playerDetails = players.reduce((acc, p) => {
            acc[p.id] = { name: p.name, id: p.id };
            return acc;
        }, {});

        setGameResult({ scores: finalScores, hands: submittedHands, evals, playerDetails });
        setGameState('results');
        setError('');
    };

    return (
        <div className="game-container">
            <header className="game-header">
                <Link to="/" className="back-to-lobby-button">返回大厅</Link>
                <h1>十三水 - 离线试玩</h1>
                {error && <p className="error-message">{error}</p>}
            </header>

            {gameState === 'playing' && (
                <>
                    <div className="arranged-hands">
                        <Hand name="前墩 (3)" cards={arrangedHands.front} onCardClick={(card) => handleCardClick(card, 'front')} selectedCard={selectedCard} />
                        <Hand name="中墩 (5)" cards={arrangedHands.middle} onCardClick={(card) => handleCardClick(card, 'middle')} selectedCard={selectedCard} />
                        <Hand name="后墩 (5)" cards={arrangedHands.back} onCardClick={(card) => handleCardClick(card, 'back')} selectedCard={selectedCard} />
                    </div>
                    <div className="game-actions">
                        <button onClick={handleSmartArrange}>智能理牌</button>
                        <button onClick={handleClearHands}>清空牌墩</button>
                        <button onClick={handleSubmitHand}>比牌</button>
                    </div>
                </>
            )}

            {gameState === 'results' && gameResult && (
                <>
                    <Results results={gameResult} />
                    <button onClick={() => window.location.reload()}>再玩一局</button>
                </>
            )}
        </div>
    );
};

export default TrialGame;