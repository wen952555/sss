// frontend/src/components/TrialGame.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PlayerHand from './PlayerHand';
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
    const [myHand, setMyHand] = useState([]);
    const [arrangedHands, setArrangedHands] = useState(createEmptyHands());
    const [selectedCard, setSelectedCard] = useState(null);
    const [gameState, setGameState] = useState('playing');
    const [gameResult, setGameResult] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const allCards = dealCards();
        const humanPlayer = { id: 'human', name: '您', hand: allCards.player1 };
        const aiPlayers = [
            { id: 'ai1', name: '电脑玩家 1', hand: allCards.player2 },
            { id: 'ai2', name: '电脑玩家 2', hand: allCards.player3 },
            { id: 'ai3', name: '电脑玩家 3', hand: allCards.player4 },
        ];
        setMyHand(sortHand(humanPlayer.hand));
        setPlayers([humanPlayer, ...aiPlayers]);
    }, []);

    const handleCardClick = (card, source) => {
        if (source !== 'myHand') {
            const sourceHand = arrangedHands[source];
            const newSourceHand = sourceHand.filter(c => c.rank !== card.rank || c.suit !== card.suit);
            const newMyHand = sortHand([...myHand, card]);
            setArrangedHands(prev => ({ ...prev, [source]: newSourceHand }));
            setMyHand(newMyHand);
            setSelectedCard(null);
            return;
        }
        if (selectedCard?.card.suit === card.suit && selectedCard?.card.rank === card.rank) {
            setSelectedCard(null);
        } else {
            setSelectedCard({ card, source });
        }
    };

    const handleHandSlotClick = (targetHandName) => {
        if (!selectedCard || selectedCard.source !== 'myHand') return;
        const { card } = selectedCard;
        const targetHand = arrangedHands[targetHandName];
        const handLimits = { front: 3, middle: 5, back: 5 };
        if (targetHand.length >= handLimits[targetHandName]) return setError(`此墩已满`);

        const newMyHand = myHand.filter(c => c.rank !== card.rank || c.suit !== card.suit);
        const newTargetHand = sortHand([...targetHand, card]);
        setMyHand(newMyHand);
        setArrangedHands(prev => ({ ...prev, [targetHandName]: newTargetHand }));
        setSelectedCard(null);
        setError('');
    };

    const handleSmartArrange = () => {
        const allCards = [...myHand, ...arrangedHands.front, ...arrangedHands.middle, ...arrangedHands.back];
        if (allCards.length !== 13) return setError("需要全部13张手牌才能进行智能理牌。");
        const bestArrangement = findBestArrangement(allCards);
        if (bestArrangement) {
            setArrangedHands(bestArrangement);
            setMyHand([]);
            setError('');
        } else {
            setError("无法找到有效的理牌方案。");
        }
    };

    const handleSubmitHand = () => {
        if (myHand.length > 0) return setError("请摆完所有13张牌。");
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

        // **THE FIX**: Create a `playerDetails` object that maps the *same IDs* used in `scores`, `hands`, and `evals`.
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
                        <Hand name="前墩 (3)" cards={arrangedHands.front} onCardClick={handleCardClick} onSlotClick={() => handleHandSlotClick('front')} selectedCard={selectedCard} />
                        <Hand name="中墩 (5)" cards={arrangedHands.middle} onCardClick={handleCardClick} onSlotClick={() => handleHandSlotClick('middle')} selectedCard={selectedCard} />
                        <Hand name="后墩 (5)" cards={arrangedHands.back} onCardClick={handleCardClick} onSlotClick={() => handleHandSlotClick('back')} selectedCard={selectedCard} />
                    </div>
                    <div className="player-main-hand">
                        <h2>我的手牌</h2>
                        <PlayerHand cards={myHand} onCardClick={(card) => handleCardClick(card, 'myHand')} selectedCard={selectedCard} />
                    </div>
                    <div className="game-actions">
                        <button onClick={handleSmartArrange}>智能理牌</button>
                        <button onClick={handleSubmitHand} disabled={myHand.length > 0}>比牌</button>
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