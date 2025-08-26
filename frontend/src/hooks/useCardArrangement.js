import { useState, useCallback, useEffect } from 'react';
import { sortCards, areCardsEqual, getSmartSortedHand, getSmartSortedHandForEight, parseCard } from '../utils';

const getLaneLimits = (gameType) => {
  if (gameType === 'thirteen') return { top: 3, middle: 5, bottom: 5 };
  if (gameType === 'eight') return { top: 2, middle: 3, bottom: 3 };
  return { top: 0, middle: 0, bottom: 0 };
};

export const useCardArrangement = (gameType) => {
  const [LANE_LIMITS] = useState(() => getLaneLimits(gameType));

  const [topLane, setTopLane] = useState([]);
  const [middleLane, setMiddleLane] = useState([]);
  const [bottomLane, setBottomLane] = useState([]);
  const [unassignedCards, setUnassignedCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);

  const setInitialCards = useCallback((cards) => {
    setUnassignedCards(cards.map(c => (typeof c === 'string' ? parseCard(c) : c)));
    setTopLane([]);
    setMiddleLane([]);
    setBottomLane([]);
    setSelectedCards([]);
  }, []);

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
    if (selectedCards.length === 0) return false;

    const laneSetterMap = { top: setTopLane, middle: setMiddleLane, bottom: setBottomLane };
    const currentLanes = { top: topLane, middle: middleLane, bottom: bottomLane };
    const targetSetter = laneSetterMap[laneName];

    if (currentLanes[laneName].length + selectedCards.length > LANE_LIMITS[laneName]) {
      return false; // Indicate failure
    }

    targetSetter(prevLane => sortCards([...prevLane, ...selectedCards]));

    setUnassignedCards(prev => prev.filter(c => !selectedCards.some(sc => areCardsEqual(c, sc))));
    setTopLane(prev => (laneName === 'top' ? prev : prev.filter(c => !selectedCards.some(sc => areCardsEqual(c, sc)))));
    setMiddleLane(prev => (laneName === 'middle' ? prev : prev.filter(c => !selectedCards.some(sc => areCardsEqual(c, sc)))));
    setBottomLane(prev => (laneName === 'bottom' ? prev : prev.filter(c => !selectedCards.some(sc => areCardsEqual(c, sc)))));

    setSelectedCards([]);
    return true; // Indicate success
  }, [selectedCards, topLane, middleLane, bottomLane, LANE_LIMITS]);

  const handleAutoSort = useCallback(() => {
    const sorter = gameType === 'thirteen' ? getSmartSortedHand : getSmartSortedHandForEight;
    const sorted = sorter(unassignedCards);
    if (sorted) {
      setTopLane(sorted.top || []);
      setMiddleLane(sorted.middle || []);
      setBottomLane(sorted.bottom || []);
      setUnassignedCards([]);
    }
  }, [unassignedCards, gameType]);

  return {
    topLane,
    middleLane,
    bottomLane,
    unassignedCards,
    selectedCards,
    LANE_LIMITS,
    setInitialCards,
    handleCardClick,
    handleLaneClick,
    handleAutoSort
  };
};
