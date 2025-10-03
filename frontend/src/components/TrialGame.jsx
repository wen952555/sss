// frontend/src/components/TrialGame.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PlayerHand from './PlayerHand';
import Hand from './Hand';
import Results from './Results';
import { sortHand } from '../utils/cardUtils';
import {
    dealCards,
    evaluate13CardHand,
    evaluate5CardHand,
    evaluate3CardHand,
    isValidHand,
    compareEvaluatedHands,
    SEGMENT_SCORES,
    SPECIAL_HAND_TYPES
} from '../utils/gameLogic';
import { getAIArrangedHand } from '../utils/aiPlayer';
import { findBestArrangement } from '../utils/smartArrange'; // Import the new smart arrange function
import './Game.css'; // Reusing the same styles

const createEmptyHands = () => ({ front: [], middle: [], back: [] });

const TrialGame = () => {
    const [players, setPlayers] = useState([]);
    const [myHand, setMyHand] = useState([]);
    const [arrangedHands, setArrangedHands] = useState(createEmptyHands());
    const [selectedCard, setSelectedCard] = useState(null);
    const [gameState, setGameState] = useState('playing'); // playing, submitted, results
    const [gameResult, setGameResult] = useState(null);
    const [error, setError] = useState('');

    // Setup the game on component mount
    useEffect(() => {
        const allCards = dealCards();
        const humanPlayer = { id: 'human', name: '您' };
        const aiPlayers = [
            { id: 'ai1', name: '电脑玩家 1' },
            { id: 'ai2', name: '电脑玩家 2' },
            { id: 'ai3', name: '电脑玩家 3' },
        ];

        setMyHand(sortHand(allCards.player1));

        const playerSetup = [humanPlayer, ...aiPlayers].map((p, i) => ({
            ...p,
            hand: allCards[`player${i + 1}`],
        }));
        setPlayers(playerSetup);
    }, []);

    const handleCardClick = (card, source) => {
        if (selectedCard && selectedCard.card.rank === card.rank && selectedCard.card.suit === card.suit) {
            setSelectedCard(null);
        } else {
            setSelectedCard({ card, source });
        }
    };

    const handleHandSlotClick = (targetHandName) => {
        if (!selectedCard) return;
        const { card, source } = selectedCard;
        const targetHand = arrangedHands[targetHandName];
        const handLimits = { front: 3, middle: 5, back: 5 };

        if (targetHand.length >= handLimits[targetHandName]) {
            setError(`此墩已满`);
            return;
        }

        const sourceIsArranged = source !== 'myHand';
        const sourceHand = sourceIsArranged ? arrangedHands[source] : myHand;
        const newSourceHand = sourceHand.filter(c => !(c.rank === card.rank && c.suit === card.suit));
        const newTargetHand = sortHand([...targetHand, card]);

        if (sourceIsArranged) {
            setArrangedHands({ ...arrangedHands, [source]: newSourceHand, [targetHandName]: newTargetHand });
        } else {
            setMyHand(newSourceHand);
            setArrangedHands({ ...arrangedHands, [targetHandName]: newTargetHand });
        }

        setSelectedCard(null);
        setError('');
    };

    const handleSubmitHand = () => {
        if (myHand.length > 0) {
            return setError("请摆完所有13张牌。");
        }

        if (!isValidHand(arrangedHands.front, arrangedHands.middle, arrangedHands.back)) {
            return setError("您摆的牌型不符合规则（倒水），请重新摆牌。");
        }

        // AI arranges their hands
        const allPlayerHands = {
            human: arrangedHands,
        };
        players.slice(1).forEach(ai => {
            allPlayerHands[ai.id] = getAIArrangedHand(ai.hand);
        });

        // --- Calculate Results (Offline) ---
        const playerIds = Object.keys(allPlayerHands);
        const submittedHands = allPlayerHands;
        const finalScores = {};
        const evals = {};

        for (const id of playerIds) {
            const { front, middle, back } = submittedHands[id];
            evals[id] = {
                front: evaluate3CardHand(front),
                middle: evaluate5CardHand(middle),
                back: evaluate5CardHand(back),
            };
        }

        // Basic point comparison (no special hands for now in trial)
        const playerScores = playerIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {});
        for (let i = 0; i < playerIds.length; i++) {
            for (let j = i + 1; j < playerIds.length; j++) {
                const p1_id = playerIds[i];
                const p2_id = playerIds[j];
                let p1_score = 0;
                let p2_score = 0;

                ['front', 'middle', 'back'].forEach(segment => {
                    const comparison = compareEvaluatedHands(evals[p1_id][segment], evals[p2_id][segment]);
                    if (comparison > 0) p1_score++;
                    else if (comparison < 0) p2_score++;
                });

                playerScores[p1_id] += (p1_score - p2_score);
                playerScores[p2_id] += (p2_score - p1_score);
            }
        }

        for (const id of playerIds) {
            finalScores[id] = { total: playerScores[id], special: null };
        }

        setGameResult({ scores: finalScores, hands: submittedHands, evals });
        setGameState('results');
        setError('');
    };

    const handleSmartArrange = () => {
        const allCards = [...myHand, ...arrangedHands.front, ...arrangedHands.middle, ...arrangedHands.back];
        if (allCards.length !== 13) {
            return setError("需要全部13张手牌才能进行智能理牌。");
        }
        const bestArrangement = findBestArrangement(allCards);
        if (bestArrangement) {
            setArrangedHands(bestArrangement);
            setMyHand([]);
            setError('');
        } else {
            setError("无法找到有效的理牌方案。");
        }
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
                        <Hand name="前墩 (3)" cards={arrangedHands.front} onCardClick={(card) => handleCardClick(card, 'front')} onSlotClick={() => handleHandSlotClick('front')} selectedCard={selectedCard} />
                        <Hand name="中墩 (5)" cards={arrangedHands.middle} onCardClick={(card) => handleCardClick(card, 'middle')} onSlotClick={() => handleHandSlotClick('middle')} selectedCard={selectedCard} />
                        <Hand name="后墩 (5)" cards={arrangedHands.back} onCardClick={(card) => handleCardClick(card, 'back')} onSlotClick={() => handleHandSlotClick('back')} selectedCard={selectedCard} />
                    </div>
                    <div className="player-main-hand">
                        <h2>我的手牌</h2>
                        <PlayerHand cards={myHand} onCardClick={(card) => handleCardClick(card, 'myHand')} selectedCard={selectedCard} />
                    </div>
                    <div className="game-actions">
                        <button onClick={handleSmartArrange}>智能理牌</button>
                        <button onClick={handleSubmitHand} disabled={myHand.length > 0}>
                            比牌
                        </button>
                    </div>
                </>
            )}

            {gameState === 'results' && gameResult && (
                <>
                    <Results results={gameResult} playerInfo={players} />
                    <button onClick={() => window.location.reload()}>再玩一局</button>
                </>
            )}
        </div>
    );
};

export default TrialGame;