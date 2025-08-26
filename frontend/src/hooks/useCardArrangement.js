import { useState, useCallback, useEffect } from 'react';
import { sortCards, areCardsEqual, getSmartSortedHand, getSmartSortedHandForEight, parseCard } from '../utils';

const getLaneLimits = (gameType) => {
  if (gameType === 'thirteen') return { top: 3, middle: 5, bottom: 5 };
  if (gameType === 'eight') return { top: 3, middle: 5, bottom: 0 };
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
    // When the initialCards prop changes (i.e., cards are dealt), reset the state.
    setUnassignedCards(initialCards.map(c => (typeof c === 'string' ? parseCard(c) : c)));
    setTopLane([]);
    setMiddleLane([]);
    setBottomLane([]);
    setSelectedCards([]);
  }, [initialCards]);

  const handleCardClick = useCallback((card, source, sourceLaneName = null) => {
    const cardIsSelected = selectedCards.some(c => areCardsEqual(c, card));

    let newSelectedCards = [...selectedCards];
    let newUnassigned = [...unassignedCards];
    let newTop = [...topLane];
    let newMiddle = [...middleLane];
    let newBottom = [...bottomLane];

    const laneMap = { top: newTop, middle: newMiddle, bottom: newBottom };

    if (cardIsSelected) {
      newSelectedCards = newSelectedCards.filter(c => !areCardsEqual(c, card));
      if (source === 'unassigned') newUnassigned.push(card);
      else if (sourceLaneName) laneMap[sourceLaneName].push(card);
    } else {
      newSelectedCards.push(card);
      if (source === 'unassigned') newUnassigned = newUnassigned.filter(c => !areCardsEqual(c, card));
      else if (sourceLaneName) laneMap[sourceLaneName] = laneMap[sourceLaneName].filter(c => !areCardsEqual(c, card));
    }

    setSelectedCards(newSelectedCards);
    setUnassignedCards(sortCards(newUnassigned));
    setTopLane(sortCards(newTop));
    setMiddleLane(sortCards(newMiddle));
    setBottomLane(sortCards(newBottom));
  }, [selectedCards, unassignedCards, topLane, middleLane, bottomLane]);

  const handleLaneClick = useCallback((laneName) => {
    if (selectedCards.length === 0 || laneName === 'bottom' && LANE_LIMITS.bottom === 0) return;

    const laneSetters = { top: setTopLane, middle: setMiddleLane, bottom: setBottomLane };
    const lanes = { top: topLane, middle: middleLane, bottom: bottomLane };
    const targetLane = lanes[laneName];
    const setter = laneSetters[laneName];
    const limit = LANE_LIMITS[laneName];

    if (targetLane.length + selectedCards.length > limit) {
      // Maybe set an error message state here in the future
      return;
    }

    setter(sortCards([...targetLane, ...selectedCards]));
    setUnassignedCards(unassignedCards.filter(c => !selectedCards.some(sc => areCardsEqual(c, sc))));
    setSelectedCards([]);
  }, [selectedCards, unassignedCards, topLane, middleLane, bottomLane, LANE_LIMITS]);

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
    handleCardClick,
    handleLaneClick,
    handleAutoSort
  };
};
