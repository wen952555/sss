import { useState, useCallback } from 'react';
import { sortCards, areCardsEqual, parseCard } from '../utils';
import { getSmartSortedHand } from '../utils/autoSorter.js';

const LANE_LIMITS_THIRTEEN = { top: 3, middle: 5, bottom: 5 };

export const useCardArrangement = () => {
  const [LANE_LIMITS] = useState(LANE_LIMITS_THIRTEEN);

  const [topLane, setTopLane] = useState([]);
  const [middleLane, setMiddleLane] = useState([]);
  const [bottomLane, setBottomLane] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);

  const setInitialLanes = useCallback((hand) => {
    let arrangedHand = null;

    if (Array.isArray(hand)) {
      // New case: received a flat array of 13 cards from the server.
      // The cards from the server are objects like { rank: 'ace', suit: 'spades' }.
      // The getSmartSortedHand function expects card keys (e.g., 'ace_of_spades').
      const cardKeys = hand.map(c => `${c.rank}_of_${c.suit}`);
      arrangedHand = getSmartSortedHand(cardKeys);
    } else if (hand && hand.top) {
      // Existing case: received a pre-arranged hand object.
      arrangedHand = hand;
    }

    if (arrangedHand) {
      // The auto-sorter and the old API might return strings or objects, so we handle both.
      setTopLane(arrangedHand.top.map(c => (typeof c === 'string' ? parseCard(c) : c)) || []);
      setMiddleLane(arrangedHand.middle.map(c => (typeof c === 'string' ? parseCard(c) : c)) || []);
      setBottomLane(arrangedHand.bottom.map(c => (typeof c === 'string' ? parseCard(c) : c)) || []);
    } else {
      // If the hand is invalid or null, clear the lanes.
      setTopLane([]);
      setMiddleLane([]);
      setBottomLane([]);
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
