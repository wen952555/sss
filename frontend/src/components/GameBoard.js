// frontend/src/components/GameBoard.js
import React, { useState, useEffect, useCallback } from 'react';
import socket from '../socket';
import Card from './Card';
import HandDisplay from './HandDisplay';
import { sortHand } from '../utils/cardUtils';
import './GameBoard.css';

const DUN_NAMES = { FRONT: "头墩", MIDDLE: "中墩", BACK: "尾墩" };
const DUN_CAPACITIES = { [DUN_NAMES.FRONT]: 3, [DUN_NAMES.MIDDLE]: 5, [DUN_NAMES.BACK]: 5 };

const GameBoard = ({ roomId, myPlayerId, initialHand, onArrangementInvalid }) => {
    const [hand, setHand] = useState(sortHand(initialHand || []));
    const [selectedCards, setSelectedCards] = useState([]); // 当前选中的牌（未放入墩）
    
    const [frontDun, setFrontDun] = useState([]); // 存储卡牌对象
    const [middleDun, setMiddleDun] = useState([]);
    const [backDun, setBackDun] = useState([]);

    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setHand(sortHand(initialHand || []));
        // 重置墩牌和选中牌当手牌变化时 (例如新一局开始)
        setSelectedCards([]);
        setFrontDun([]);
        setMiddleDun([]);
        setBackDun([]);
        setError('');
        setIsSubmitting(false);
    }, [initialHand]);
    
    const handleCardClickInHand = (card) => {
        setError('');
        setSelectedCards(prev =>
            prev.find(c => c.id === card.id)
                ? prev.filter(c => c.id !== card.id)
                : [...prev, card]
        );
    };

    const addSelectedToDun = (dunName) => {
        if (selectedCards.length === 0) return;
        setError('');

        let currentDun, setDun, capacity;
        if (dunName === DUN_NAMES.FRONT) { [currentDun, setDun, capacity] = [frontDun, setFrontDun, DUN_CAPACITIES.头墩]; }
        else if (dunName === DUN_NAMES.MIDDLE) { [currentDun, setDun, capacity] = [middleDun, setMiddleDun, DUN_CAPACITIES.中墩]; }
        else if (dunName === DUN_NAMES.BACK) { [currentDun, setDun, capacity] = [backDun, setBackDun, DUN_CAPACITIES.尾墩]; }
        else return;

        if (currentDun.length + selectedCards.length > capacity) {
            setError(`${dunName} 最多只能放 ${capacity} 张牌`);
            return;
        }

        setDun(prevDun => sortHand([...prevDun, ...selectedCards]));
        setHand(prevHand => prevHand.filter(card => !selectedCards.find(sc => sc.id === card.id)));
        setSelectedCards([]);
    };

    const removeCardFromDun = (card, dunName) => {
        setError('');
        let setDunFunction;
        if (dunName === DUN_NAMES.FRONT) setDunFunction = setFrontDun;
        else if (dunName === DUN_NAMES.MIDDLE) setDunFunction = setMiddleDun;
        else if (dunName === DUN_NAMES.BACK) setDunFunction = setBackDun;
        else return;

        setDunFunction(prevDun => prevDun.filter(c => c.id !== card.id));
        setHand(prevHand => sortHand([...prevHand, card])); // 将牌放回手牌
    };

    const handleSubmitArrangement = () => {
        setError('');
        if (frontDun.length !== DUN_CAPACITIES.头墩 || 
            middleDun.length !== DUN_CAPACITIES.中墩 || 
            backDun.length !== DUN_CAPACITIES.尾墩) {
            setError('请将所有墩都摆满正确的牌数 (3-5-5)。');
            return;
        }
        
        // 只需要发送牌的ID
        const arrangement = {
            front: frontDun.map(c => c.id),
            middle: middleDun.map(c => c.id),
            back: backDun.map(c => c.id),
        };
        setIsSubmitting(true);
        socket.emit('submitArrangement', { roomId, arrangement });
    };
    
    // 监听来自App.js转发的牌型无效事件
    useEffect(() => {
        const handleInvalid = (message) => {
            if (onArrangementInvalid) { // 这个 prop 由 App.js 传入
                setError(message);
                setIsSubmitting(false);
            }
        };
        socket.on('arrangementInvalid', handleInvalid);
        return () => socket.off('arrangementInvalid', handleInvalid);
    }, [onArrangementInvalid, socket]);


    if (!initialHand || initialHand.length === 0) {
        return <div className="game-board-container"><p>等待发牌...</p></div>;
    }

    return (
        <div className="game-board-container">
            <h3>我的手牌 (拖拽或点击选择后放入对应墩)</h3>
            {error && <p className="error-message">{error}</p>}
            
            <div className="my-hand-area">
                {hand.map(card => (
                    <Card
                        key={card.id}
                        card={card}
                        isSelected={selectedCards.find(c => c.id === card.id)}
                        onClick={() => handleCardClickInHand(card)}
                    />
                ))}
                {hand.length === 0 && <p>手牌已全部摆放。</p>}
            </div>

            {selectedCards.length > 0 && (
                <div className="selected-cards-info">
                    已选择 {selectedCards.length} 张牌.
                    <button onClick={() => addSelectedToDun(DUN_NAMES.FRONT)} disabled={frontDun.length >= DUN_CAPACITIES.头墩}>放入头墩</button>
                    <button onClick={() => addSelectedToDun(DUN_NAMES.MIDDLE)} disabled={middleDun.length >= DUN_CAPACITIES.中墩}>放入中墩</button>
                    <button onClick={() => addSelectedToDun(DUN_NAMES.BACK)} disabled={backDun.length >= DUN_CAPACITIES.尾墩}>放入尾墩</button>
                </div>
            )}

            <div className="arrangement-area">
                <HandDisplay
                    title={DUN_NAMES.FRONT}
                    cardObjects={frontDun} // 传递完整的牌对象
                    onCardClick={(card) => removeCardFromDun(card, DUN_NAMES.FRONT)}
                    selectedCards={[]} // 在墩里不需要选中效果
                />
                <HandDisplay
                    title={DUN_NAMES.MIDDLE}
                    cardObjects={middleDun}
                    onCardClick={(card) => removeCardFromDun(card, DUN_NAMES.MIDDLE)}
                />
                <HandDisplay
                    title={DUN_NAMES.BACK}
                    cardObjects={backDun}
                    onCardClick={(card) => removeCardFromDun(card, DUN_NAMES.BACK)}
                />
            </div>

            <button 
                className="submit-arrangement-button"
                onClick={handleSubmitArrangement}
                disabled={isSubmitting || frontDun.length !== DUN_CAPACITIES.头墩 || middleDun.length !== DUN_CAPACITIES.中墩 || backDun.length !== DUN_CAPACITIES.尾墩 || hand.length > 0}
            >
                {isSubmitting ? '提交中...' : '确认出牌'}
            </button>
        </div>
    );
};

export default GameBoard;
