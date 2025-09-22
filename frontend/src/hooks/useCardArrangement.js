import { useState, useCallback } from 'react';
import { sortCards, areCardsEqual, parseCard } from '../utils';

const LANE_LIMITS_THIRTEEN = { top: 3, middle: 5, bottom: 5 };

export const useCardArrangement = () => {
  const [LANE_LIMITS] = useState(LANE_LIMITS_THIRTEEN);

  const [topLane, setTopLane] = useState([]);
  const [middleLane, setMiddleLane] = useState([]);
  const [bottomLane, setBottomLane] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);

  const setInitialLanes = useCallback((sortedHand) => {
    if (sortedHand) {
      setTopLane((sortedHand.top || []).map(c => (typeof c === 'string' ? parseCard(c) : c)).filter(Boolean));
      setMiddleLane((sortedHand.middle || []).map(c => (typeof c === 'string' ? parseCard(c) : c)).filter(Boolean));
      setBottomLane((sortedHand.bottom || []).map(c => (typeof c === 'string' ? parseCard(c) : c)).filter(Boolean));
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
    const targetLane = currentLanes[laneName];

    if (targetLane.length + selectedCards.length > LANE_LIMITS[laneName]) {
      // Prevent adding cards if it exceeds the lane limit.
      // The UI should provide feedback for this action.
      return;
    }

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

  return {
    topLane,
    middleLane,
    bottomLane,
    selectedCards,
    LANE_LIMITS,
    setInitialLanes,
    handleCardClick,
    handleLaneClick,
  };
};
