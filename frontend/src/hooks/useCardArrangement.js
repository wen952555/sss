import { useState, useCallback, useEffect } from 'react';
import { sortCards, areCardsEqual, getSmartSortedHand, getSmartSortedHandForEight, parseCard } from '../utils';

const getLaneLimits = (gameType) => {
  if (gameType === 'thirteen') return { top: 3, middle: 5, bottom: 5 };
  // Corrected 8-card game limits based on user feedback
  if (gameType === 'eight') return { top: 2, middle: 3, bottom: 3 };
  return { top: 0, middle: 0, bottom: 0 };
};

export const useCardArrangement = (initialCards, gameType) => {
  const LANE_LIMITS = getLaneLimits(gameType);

  const [topLane, setTopLane] = useState([]);
  const [middleLane, setMiddleLane] = useState([]);
  const [bottomLane, setBottomLane] = useState([]);
  const [unassignedCards, setUnassignedCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);

  useEffect(() => {
    setUnassignedCards(initialCards.map(c => (typeof c === 'string' ? parseCard(c) : c)));
    setTopLane([]);
    setMiddleLane([]);
    setBottomLane([]);
    setSelectedCards([]);
  }, [initialCards]);

  const handleCardClick = useCallback((card) => {
    setSelectedCards(prevSelected => {
      const isSelected = prevSelected.some(c => areCardsEqual(c, card));
      if (isSelected) {
        return prevSelected.filter(c => !areCardsEqual(c, card));
      } else {
        return [...prevSelected, card];
      }
    });
  }, []);

  const handleLaneClick = useCallback((laneName) => {
    if (selectedCards.length === 0) return;

    const laneSetterMap = { top: setTopLane, middle: setMiddleLane, bottom: setBottomLane };
    const targetSetter = laneSetterMap[laneName];
    const currentLanes = { top: topLane, middle: middleLane, bottom: bottomLane };

    if (currentLanes[laneName].length + selectedCards.length > LANE_LIMITS[laneName]) {
      return; // Lane is full
    }

    targetSetter(prevLane => sortCards([...prevLane, ...selectedCards]));

    // Remove cards from all possible original locations
    setUnassignedCards(prev => prev.filter(c => !selectedCards.some(sc => areCardsEqual(c, sc))));
    setTopLane(prev => (laneName === 'top' ? prev : prev.filter(c => !selectedCards.some(sc => areCardsEqual(c, sc)))));
    setMiddleLane(prev => (laneName === 'middle' ? prev : prev.filter(c => !selectedCards.some(sc => areCardsEqual(c, sc)))));
    setBottomLane(prev => (laneName === 'bottom' ? prev : prev.filter(c => !selectedCards.some(sc => areCardsEqual(c, sc)))));

    setSelectedCards([]);
  }, [selectedCards, topLane, middleLane, bottomLane, LANE_LIMITS]);

  const handleAutoSort = useCallback(() => {
    const sorter = gameType === 'thirteen' ? getSmartSortedHand : getSmartSortedHandForEight;
    const sorted = sorter(unassignedCards);
    if (sorted) {
      setTopLane(sorted.top.map(c => (typeof c === 'string' ? parseCard(c) : c)) || []);
      setMiddleLane(sorted.middle.map(c => (typeof c === 'string' ? parseCard(c) : c)) || []);
      setBottomLane(sorted.bottom.map(c => (typeof c === 'string' ? parseCard(c) : c)) || []);
      setUnassignedCards([]);
    }
  }, [unassignedCards, gameType]);

  return {
    topLane,
    middleLane,
    bottomLane,
    unassignedCards,
    selectedCards,
    handleCardClick,
    handleLaneClick,
    handleAutoSort,
    // Expose setters for direct manipulation
    setTopLane,
    setMiddleLane,
    setBottomLane,
    setUnassignedCards
  };
};
