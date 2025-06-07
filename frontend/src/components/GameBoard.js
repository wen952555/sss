// src/components/GameBoard.js
import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import HandArea from './HandArea';
import { fetchInitialCards, evaluateArrangement } from '../utils/api';

const initialHandsState = {
    playerPool: { id: 'playerPool', title: 'Your Hand', cards: [] },
    frontHand: { id: 'frontHand', title: 'Front Hand', cards: [], limit: 3, evalText: '' },
    middleHand: { id: 'middleHand', title: 'Middle Hand', cards: [], limit: 5, evalText: '' },
    backHand: { id: 'backHand', title: 'Back Hand', cards: [], limit: 5, evalText: '' },
};

const GameBoard = () => {
    const [hands, setHands] = useState(initialHandsState);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' }); // type: 'success' or 'error'

    const dealNewCards = useCallback(async () => {
        setIsLoading(true);
        setMessage({ text: '', type: '' });
        try {
            const data = await fetchInitialCards();
            setHands({
                playerPool: { ...initialHandsState.playerPool, cards: data.cards || [] },
                frontHand: { ...initialHandsState.frontHand, cards: [], evalText: '' },
                middleHand: { ...initialHandsState.middleHand, cards: [], evalText: '' },
                backHand: { ...initialHandsState.backHand, cards: [], evalText: '' },
            });
        } catch (error) {
            console.error("Failed to fetch cards:", error);
            setMessage({ text: `Error fetching cards: ${error.message}`, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        dealNewCards();
    }, [dealNewCards]);

    const onDragEnd = (result) => {
        const { source, destination } = result;

        // Dropped outside a valid droppable
        if (!destination) return;

        const sourceHandId = source.droppableId;
        const destHandId = destination.droppableId;

        // If dropped in the same place, do nothing (or handle reordering within the same list if desired)
        if (sourceHandId === destHandId && source.index === destination.index) return;
        
        setHands(prevHands => {
            const newHands = JSON.parse(JSON.stringify(prevHands)); // Deep copy
            const sourceCards = Array.from(newHands[sourceHandId].cards);
            const destCards = Array.from(newHands[destHandId].cards);
            const [movedCard] = sourceCards.splice(source.index, 1);

            // Check card limit for destination
            if (newHands[destHandId].limit && destCards.length >= newHands[destHandId].limit) {
                setMessage({ text: `${newHands[destHandId].title} can only hold ${newHands[destHandId].limit} cards.`, type: 'error' });
                return prevHands; // Revert to previous state
            }

            destCards.splice(destination.index, 0, movedCard);

            newHands[sourceHandId].cards = sourceCards;
            newHands[destHandId].cards = destCards;
            
            // Clear message on successful drag
            setMessage({ text: '', type: '' });
            return newHands;
        });
    };

    const handleSubmitArrangement = async () => {
        setMessage({ text: '', type: '' });
        if (hands.frontHand.cards.length !== 3 || 
            hands.middleHand.cards.length !== 5 || 
            hands.backHand.cards.length !== 5) {
            setMessage({ text: 'Please complete all hands: Front (3), Middle (5), Back (5).', type: 'error' });
            return;
        }

        setIsLoading(true);
        try {
            // Pass only necessary card data (id, suit, value, rankValue) to backend
            const prepareHandForApi = (cardArray) => cardArray.map(c => ({
                id: c.id, suit: c.suit, value: c.value, rankValue: c.rankValue, imageName: c.imageName // imageName for potential re-rendering
            }));

            const result = await evaluateArrangement(
                prepareHandForApi(hands.frontHand.cards),
                prepareHandForApi(hands.middleHand.cards),
                prepareHandForApi(hands.backHand.cards)
            );

            if (result.success) {
                setMessage({ text: result.validation.message, type: result.validation.isValid ? 'success' : 'error' });
                // Update hand evaluation text
                setHands(prev => ({
                    ...prev,
                    frontHand: {...prev.frontHand, evalText: result.evaluations.front.type_name },
                    middleHand: {...prev.middleHand, evalText: result.evaluations.middle.type_name },
                    backHand: {...prev.backHand, evalText: result.evaluations.back.type_name },
                }));
            } else {
                setMessage({ text: result.message || 'Evaluation failed.', type: 'error' });
            }
        } catch (error) {
            console.error("Error evaluating hands:", error);
            setMessage({ text: `Error: ${error.message}`, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const canSubmit = hands.frontHand.cards.length === 3 &&
                      hands.middleHand.cards.length === 5 &&
                      hands.backHand.cards.length === 5;

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="game-board">
                <h1>Thirteen Card Game</h1>
                
                <div className="player-hand-area">
                    <h3>{hands.playerPool.title} ({hands.playerPool.cards.length})</h3>
                    <HandArea droppableId="playerPool" cards={hands.playerPool.cards} type="pool" />
                </div>

                <div className="arranged-hands-area">
                    <h3>Arranged Hands</h3>
                    <div className="arranged-hands">
                        <HandArea droppableId="frontHand" cards={hands.frontHand.cards} title="Front" type="front" cardLimit={3} evaluationText={hands.frontHand.evalText} />
                        <HandArea droppableId="middleHand" cards={hands.middleHand.cards} title="Middle" type="middle" cardLimit={5} evaluationText={hands.middleHand.evalText} />
                        <HandArea droppableId="backHand" cards={hands.backHand.cards} title="Back" type="back" cardLimit={5} evaluationText={hands.backHand.evalText} />
                    </div>
                </div>

                <div className="controls">
                    <button onClick={dealNewCards} disabled={isLoading}>
                        {isLoading ? 'Dealing...' : 'Deal New Hand'}
                    </button>
                    <button onClick={handleSubmitArrangement} disabled={isLoading || !canSubmit}>
                        {isLoading ? 'Checking...' : 'Check Arrangement'}
                    </button>
                </div>

                {message.text && (
                    <div className={`message-area ${message.type}`}>
                        {message.text}
                    </div>
                )}
            </div>
        </DragDropContext>
    );
};

export default GameBoard;
