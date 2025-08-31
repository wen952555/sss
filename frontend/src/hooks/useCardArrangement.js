import { useState, useCallback } from 'react';
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
  const [selectedCards, setSelectedCards] = useState([]);

  const setInitialLanes = useCallback((sortedHand) => {
    if (sortedHand) {
      setTopLane(sortedHand.top.map(c => (typeof c === 'string' ? parseCard(c) : c)) || []);
      setMiddleLane(sortedHand.middle.map(c => (typeof c === 'string' ? parseCard(c) : c)) || []);
      setBottomLane(sortedHand.bottom.map(c => (typeof c === 'string' ? parseCard(c) : c)) || []);
    }
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
    if (selectedCards.length === 0) return;

    const currentLanes = { top: topLane, middle: middleLane, bottom: bottomLane };

    // Create a mutable copy of lanes
    const newLanes = {
      top: [...currentLanes.top],
      middle: [...currentLanes.middle],
      bottom: [...currentLanes.bottom],
    };

    // Remove selected cards from their current lanes
    selectedCards.forEach(card => {
        for (const lane of Object.values(newLanes)) {
            const index = lane.findIndex(c => areCardsEqual(c, card));
            if (index !== -1) {
                lane.splice(index, 1);
                break;
            }
        }
    });

    // Add selected cards to the target lane
    newLanes[laneName] = [...newLanes[laneName], ...selectedCards];

    setTopLane(sortCards(newLanes.top));
    setMiddleLane(sortCards(newLanes.middle));
    setBottomLane(sortCards(newLanes.bottom));
    setSelectedCards([]);

  }, [selectedCards, topLane, middleLane, bottomLane]);

  const handleAutoSort = useCallback((allCards) => {
    const sorter = gameType === 'thirteen' ? getSmartSortedHand : getSmartSortedHandForEight;
    const sorted = sorter(allCards);
    if (sorted) {
      setTopLane(sorted.top || []);
      setMiddleLane(sorted.middle || []);
      setBottomLane(sorted.bottom || []);
      setSelectedCards([]);
    }
  }, [gameType]);

  return {
    topLane,
    middleLane,
    bottomLane,
    selectedCards,
    LANE_LIMITS,
    setInitialLanes,
    handleCardClick,
    handleLaneClick,
    handleAutoSort
  };
};
