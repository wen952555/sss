// frontend/src/components/GameBoard.js
import React, { useState, useEffect } from 'react';
import socket from '../socket';
import Card from './Card';
import HandDisplay from './HandDisplay';
import { sortHand } from '../utils/cardUtils'; // 确保 sortHand 已正确导入
import './GameBoard.css'; // 确保引入了CSS

const DUN_NAMES = { FRONT: "头墩", MIDDLE: "中墩", BACK: "尾墩" };
const DUN_CAPACITIES = { 
    [DUN_NAMES.FRONT]: 3, 
    [DUN_NAMES.MIDDLE]: 5, 
    [DUN_NAMES.BACK]: 5 
};

const GameBoard = ({ roomId, myPlayerId, initialHand, onArrangementInvalid }) => {
    // initialHand 是从 Room 组件传过来的当前玩家的13张完整牌对象数组
    const [hand, setHand] = useState([]); // 玩家当前手上还未摆放的牌
    const [selectedCards, setSelectedCards] = useState([]); // 当前点击选中的牌
    
    const [frontDun, setFrontDun] = useState([]); // 头墩的牌（牌对象）
    const [middleDun, setMiddleDun] = useState([]); // 中墩的牌（牌对象）
    const [backDun, setBackDun] = useState([]);   // 尾墩的牌（牌对象）

    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false); // 是否正在提交手动摆牌
    const [isAiProcessing, setIsAiProcessing] = useState(false); // AI是否正在处理

    // 当 initialHand (父组件传来的完整13张牌) 更新时，重置所有与摆牌相关的状态
    useEffect(() => {
        if (initialHand && initialHand.length === 13) {
            // 使用 initialHand 的副本初始化 hand 状态，并排序
            setHand(sortHand([...initialHand])); 
            setSelectedCards([]);
            setFrontDun([]);
            setMiddleDun([]);
            setBackDun([]);
            setError('');
            setIsSubmitting(false);
            setIsAiProcessing(false);
        } else {
            // 如果 initialHand 无效或不是13张，清空所有牌相关的状态
            setHand([]);
            setSelectedCards([]);
            setFrontDun([]);
            setMiddleDun([]);
            setBackDun([]);
        }
    }, [initialHand]); // 依赖于 initialHand
    
    const handleCardClickInHand = (card) => {
        if (isAiProcessing || isSubmitting) return; // AI处理或提交中，不允许操作
        setError('');
        setSelectedCards(prev =>
            prev.find(c => c.id === card.id)
                ? prev.filter(c => c.id !== card.id)
                : [...prev, card]
        );
    };

    const addSelectedToDun = (dunName) => {
        if (isAiProcessing || isSubmitting) return;
        if (selectedCards.length === 0) return;
        setError('');

        let currentDun, setDun, capacity;
        if (dunName === DUN_NAMES.FRONT) { [currentDun, setDun, capacity] = [frontDun, setFrontDun, DUN_CAPACITIES[DUN_NAMES.FRONT]]; }
        else if (dunName === DUN_NAMES.MIDDLE) { [currentDun, setDun, capacity] = [middleDun, setMiddleDun, DUN_CAPACITIES[DUN_NAMES.MIDDLE]]; }
        else if (dunName === DUN_NAMES.BACK) { [currentDun, setDun, capacity] = [backDun, setBackDun, DUN_CAPACITIES[DUN_NAMES.BACK]]; }
        else return;

        if (currentDun.length + selectedCards.length > capacity) {
            setError(`${dunName} 最多只能放 ${capacity} 张牌`);
            setSelectedCards([]); // 清空选择，避免误操作
            return;
        }

        // 将选中的牌加入墩，并从手牌中移除
        const newDunCards = sortHand([...currentDun, ...selectedCards]); // 确保墩内牌也有序
        setDun(newDunCards);
        setHand(prevHand => prevHand.filter(cardInHand => !selectedCards.find(sc => sc.id === cardInHand.id)));
        setSelectedCards([]); // 清空选择
    };

    const removeCardFromDun = (cardToRemove, dunName) => {
        if (isAiProcessing || isSubmitting) return;
        setError('');
        let setDunFunction;
        if (dunName === DUN_NAMES.FRONT) setDunFunction = setFrontDun;
        else if (dunName === DUN_NAMES.MIDDLE) setDunFunction = setMiddleDun;
        else if (dunName === DUN_NAMES.BACK) setDunFunction = setBackDun;
        else return;

        // 从墩中移除牌，并将其加回手牌区
        setDunFunction(prevDun => prevDun.filter(c => c.id !== cardToRemove.id));
        setHand(prevHand => sortHand([...prevHand, cardToRemove]));
        setSelectedCards([]); // 清空选择
    };

    const handleSubmitArrangement = () => {
        if (isAiProcessing || isSubmitting) return;
        setError('');
        // 验证所有墩张数是否正确
        if (frontDun.length !== DUN_CAPACITIES[DUN_NAMES.FRONT] || 
            middleDun.length !== DUN_CAPACITIES[DUN_NAMES.MIDDLE] || 
            backDun.length !== DUN_CAPACITIES[DUN_NAMES.BACK]) {
            setError('请将所有墩都摆满正确的牌数 (3-5-5)。');
            return;
        }
        // 验证手牌是否已全部摆完
        if (hand.length > 0) {
            setError('您还有未摆放的手牌。');
            return;
        }
        
        const arrangementIds = {
            front: frontDun.map(c => c.id),
            middle: middleDun.map(c => c.id),
            back: backDun.map(c => c.id),
        };
        setIsSubmitting(true);
        socket.emit('submitArrangement', { roomId, arrangement: arrangementIds });
    };

    // 新增：AI 自动分牌请求处理函数
    const handleAiArrange = () => {
        if (!initialHand || initialHand.length !== 13) { // 应该基于 initialHand 而不是 hand
            setError("手牌信息不完整，无法使用AI分牌。");
            return;
        }
        if (isAiProcessing || isSubmitting) return;

        setError('');
        setIsAiProcessing(true);
        // 清空当前墩和手牌选择，因为AI会重新分配所有牌
        setFrontDun([]);
        setMiddleDun([]);
        setBackDun([]);
        setHand([]); // AI分牌时，手牌区应该理论上由AI分配完
        setSelectedCards([]);

        socket.emit('requestAIArrangement', { roomId }); // roomId 从 props 获取
    };

    // 新增：监听后端返回的 AI 排列结果
    useEffect(() => {
        const handleAiArrangementReady = ({ arrangement }) => { // arrangement 是 { front: id[], middle: id[], back: id[] }
            if (!initialHand || initialHand.length === 0) {
                console.warn("AI Arrangement Ready: initialHand is not available yet.");
                setIsAiProcessing(false); // 重置状态
                setError("AI分牌时手牌数据丢失，请重试或手动摆牌。");
                return;
            }

            // 将后端返回的牌ID数组映射回包含完整牌对象的数组
            // 使用 initialHand 作为所有牌的来源
            const mapIdsToCardsFromInitial = (ids) => 
                ids.map(id => initialHand.find(card => card.id === id)).filter(Boolean);

            const aiFrontDun = sortHand(mapIdsToCardsFromInitial(arrangement.front));
            const aiMiddleDun = sortHand(mapIdsToCardsFromInitial(arrangement.middle));
            const aiBackDun = sortHand(mapIdsToCardsFromInitial(arrangement.back));

            // 验证AI返回的牌墩张数 (防御性编程)
            if (aiFrontDun.length !== DUN_CAPACITIES[DUN_NAMES.FRONT] ||
                aiMiddleDun.length !== DUN_CAPACITIES[DUN_NAMES.MIDDLE] ||
                aiBackDun.length !== DUN_CAPACITIES[DUN_NAMES.BACK]) {
                console.error("AI returned an arrangement with incorrect card counts:", arrangement, aiFrontDun, aiMiddleDun, aiBackDun);
                setError("AI返回的牌墩数量错误，请尝试手动摆牌或再次AI分牌。");
                setHand(sortHand([...initialHand])); // AI失败，恢复手牌让用户手动操作
            } else {
                setFrontDun(aiFrontDun);
                setMiddleDun(aiMiddleDun);
                setBackDun(aiBackDun);
                setHand([]); // AI成功分牌，手牌区清空
                setError(''); 
            }
            setIsAiProcessing(false); // 无论成功失败，结束AI处理状态
        };
        
        const handleAiError = (message) => { // 专门处理AI相关的错误信息
            if (message.toLowerCase().includes("ai")) { // 简单判断
                setIsAiProcessing(false);
                setError(message);
                // AI失败，恢复手牌让用户手动操作
                if (initialHand && initialHand.length === 13) {
                     setHand(sortHand([...initialHand]));
                }
            }
        };

        socket.on('aiArrangementReady', handleAiArrangementReady);
        socket.on('errorMsg', handleAiError); // 监听通用的errorMsg，尝试从中识别AI错误

        return () => {
            socket.off('aiArrangementReady', handleAiArrangementReady);
            socket.off('errorMsg', handleAiError);
        };
    }, [initialHand, roomId]); // roomId 加入依赖，因为 emit 中用到了

    // 监听从 App.js 传递过来的手动摆牌无效的错误
    useEffect(() => {
        const handleManualArrangementInvalid = (message) => {
            if (onArrangementInvalid) { // onArrangementInvalid 是从父组件传来的回调
                setError(message);
                setIsSubmitting(false); // 如果是提交后发现无效，重置提交状态
            }
        };
        // 这个事件名 'arrangementInvalid' 是后端 submitArrangement 验证失败时发出的
        socket.on('arrangementInvalid', handleManualArrangementInvalid); 
        return () => {
            socket.off('arrangementInvalid', handleManualArrangementInvalid);
        };
    }, [onArrangementInvalid]);


    if (!initialHand || initialHand.length === 0) {
        return <div className="game-board-container"><p>等待发牌或手牌信息...</p></div>;
    }
    
    // 判断是否所有牌都已放入墩中
    const allCardsArranged = hand.length === 0 && 
                             frontDun.length === DUN_CAPACITIES[DUN_NAMES.FRONT] &&
                             middleDun.length === DUN_CAPACITIES[DUN_NAMES.MIDDLE] &&
                             backDun.length === DUN_CAPACITIES[DUN_NAMES.BACK];

    return (
        <div className="game-board-container">
            <h3>我的手牌</h3>
            {error && <p className="error-message">{error}</p>}
            
            <div className="my-hand-area">
                {hand.map(card => (
                    <Card
                        key={card.id}
                        card={card}
                        isSelected={selectedCards.some(sc => sc.id === card.id)}
                        onClick={() => handleCardClickInHand(card)}
                    />
                ))}
                {/* 当手牌为空且墩已满时，显示不同提示 */}
                {hand.length === 0 && allCardsArranged && <p>所有牌已摆放完毕！</p>}
                {hand.length === 0 && !allCardsArranged && initialHand.length > 0 && <p>请将牌放入墩中或使用AI分牌。</p>}
            </div>

            {selectedCards.length > 0 && (
                <div className="selected-cards-info">
                    已选择 {selectedCards.length} 张牌.
                    <button onClick={() => addSelectedToDun(DUN_NAMES.FRONT)} disabled={isAiProcessing || isSubmitting || frontDun.length >= DUN_CAPACITIES[DUN_NAMES.FRONT]}>放入头墩</button>
                    <button onClick={() => addSelectedToDun(DUN_NAMES.MIDDLE)} disabled={isAiProcessing || isSubmitting || middleDun.length >= DUN_CAPACITIES[DUN_NAMES.MIDDLE]}>放入中墩</button>
                    <button onClick={() => addSelectedToDun(DUN_NAMES.BACK)} disabled={isAiProcessing || isSubmitting || backDun.length >= DUN_CAPACITIES[DUN_NAMES.BACK]}>放入尾墩</button>
                </div>
            )}

            <div className="arrangement-area">
                <HandDisplay
                    title={DUN_NAMES.FRONT}
                    cardObjects={frontDun}
                    onCardClick={removeCardFromDun} // 允许从墩中取回牌
                />
                <HandDisplay
                    title={DUN_NAMES.MIDDLE}
                    cardObjects={middleDun}
                    onCardClick={removeCardFromDun}
                />
                <HandDisplay
                    title={DUN_NAMES.BACK}
                    cardObjects={backDun}
                    onCardClick={removeCardFromDun}
                />
            </div>
            
            <div className="action-buttons">
                <button 
                    className="ai-arrange-button"
                    onClick={handleAiArrange}
                    disabled={isAiProcessing || isSubmitting || !initialHand || initialHand.length !== 13} // 必须有完整初始手牌才能AI分牌
                >
                    {isAiProcessing ? 'AI计算中...' : 'AI自动分牌'}
                </button>
                <button 
                    className="submit-arrangement-button"
                    onClick={handleSubmitArrangement}
                    // 必须所有牌都摆好才能提交
                    disabled={isSubmitting || isAiProcessing || !allCardsArranged}
                >
                    {isSubmitting ? '提交中...' : '确认出牌'}
                </button>
            </div>
        </div>
    );
};

export default GameBoard;
