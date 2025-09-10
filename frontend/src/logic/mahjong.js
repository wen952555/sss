// mahjong.js - Core game logic for Mahjong

const SUITS = {
  m: 'characters', // 万
  p: 'dots',       // 筒
  s: 'bamboo',     // 条
  z: 'honors',     // 字
};

const HONOR_TILES = ['east', 'south', 'west', 'north', 'red', 'green', 'white'];

/**
 * Creates a standard 136-tile Mahjong set.
 * Each tile is represented as an object.
 * A full set contains 4 copies of each tile.
 * @returns {Array<Object>} An array of 136 tile objects.
 */
export function createTileSet() {
  const tiles = [];

  // Generate suit tiles (characters, dots, bamboo)
  for (const suit of ['m', 'p', 's']) {
    for (let rank = 1; rank <= 9; rank++) {
      for (let copy = 1; copy <= 4; copy++) {
        const baseId = `${rank}${suit}`;
        tiles.push({
          id: `${baseId}_${copy}`,
          suit: SUITS[suit],
          rank: rank,
          image: `/photo/${baseId}.svg`,
        });
      }
    }
  }

  // Generate honor tiles (winds and dragons)
  for (let rank = 1; rank <= 7; rank++) {
    for (let copy = 1; copy <= 4; copy++) {
      const baseId = `${rank}z`;
      tiles.push({
        id: `${baseId}_${copy}`,
        suit: SUITS.z,
        rank: HONOR_TILES[rank - 1], // e.g., 'east', 'red'
        image: `/photo/${baseId}.svg`,
      });
    }
  }

  return tiles;
}

/**
 * Shuffles an array of tiles using the Fisher-Yates algorithm.
 * @param {Array<Object>} tiles - The array of tiles to shuffle.
 * @returns {Array<Object>} The shuffled array of tiles.
 */
export function shuffleTiles(tiles) {
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deals tiles to 4 players from a shuffled tile set.
 * Each player gets 13 tiles.
 * @param {Array<Object>} shuffledTiles - A shuffled array of 136 tiles.
 * @returns {Object} An object containing hands for 4 players and the remaining wall.
 */
export function dealTiles(shuffledTiles) {
  if (shuffledTiles.length !== 136) {
    throw new Error("A standard 136-tile set is required for dealing.");
  }

  const handSize = 13;
  const numPlayers = 4;

  const player1 = shuffledTiles.slice(0, handSize);
  const player2 = shuffledTiles.slice(handSize, handSize * 2);
  const player3 = shuffledTiles.slice(handSize * 2, handSize * 3);
  const player4 = shuffledTiles.slice(handSize * 3, handSize * 4);

  const wall = shuffledTiles.slice(handSize * 4);

  return { player1, player2, player3, player4, wall };
}

/**
 * Performs a simple AI turn: draws a tile and discards a random tile.
 * @param {Array<Object>} hand - The AI player's current hand.
 * @param {Array<Object>} wall - The current wall.
 * @returns {Object} An object containing the updated hand, the updated wall, and the discarded tile.
 */
export function performAITurn(hand, wall) {
  if (wall.length === 0) {
    return { updatedHand: hand, updatedWall: wall, discardedTile: null };
  }

  // 1. Draw a tile from the wall
  const newWall = [...wall];
  const drawnTile = newWall.shift();
  const currentHand = [...hand, drawnTile];

  // 2. Discard a random tile from the hand
  const discardIndex = Math.floor(Math.random() * currentHand.length);
  const discardedTile = currentHand.splice(discardIndex, 1)[0];

  const updatedHand = currentHand; // hand is already modified by splice

  return { updatedHand, updatedWall: newWall, discardedTile };
}

/**
 * Converts a hand of tile objects into a map of tile names to their counts.
 * e.g., { '1m': 2, '2m': 1, ... }
 * @param {Array<Object>} hand - The player's hand.
 * @returns {Map<string, number>} A map of tile counts.
 */
function getTileCounts(hand) {
  const counts = new Map();
  // Use a simplified tile name for counting, e.g., '1m', '2p', '1z' (east wind)
  const simplifiedHand = hand.map(tile => {
    if (tile.suit === 'honors') {
      // Map honor names back to a numeric rank for simplicity in sorting and checking sequences
      return `${HONOR_TILES.indexOf(tile.rank) + 1}z`;
    }
    return `${tile.rank}${tile.suit.charAt(0)}`;
  });

  for (const tileName of simplifiedHand) {
    counts.set(tileName, (counts.get(tileName) || 0) + 1);
  }
  return counts;
}

/**
 * Recursively checks if a given set of tiles can be formed into melds (sets of 3).
 * @param {Map<string, number>} counts - A map of tile counts.
 * @returns {boolean} True if the tiles can form melds, false otherwise.
 */
function canFormMelds(counts) {
  const firstTile = [...counts.keys()].sort()[0];
  if (!firstTile) {
    return true; // Base case: no tiles left, all have been formed into melds
  }

  const count = counts.get(firstTile);
  const newCounts = new Map(counts);

  // Try to form a Pung (triplet)
  if (count >= 3) {
    newCounts.set(firstTile, count - 3);
    if (newCounts.get(firstTile) === 0) {
      newCounts.delete(firstTile);
    }
    if (canFormMelds(newCounts)) {
      return true;
    }
  }

  // Try to form a Chow (sequence), only for suit tiles (m, p, s)
  const suit = firstTile.charAt(firstTile.length - 1);
  if (suit !== 'z') {
    const rank = parseInt(firstTile, 10);
    const next1 = `${rank + 1}${suit}`;
    const next2 = `${rank + 2}${suit}`;
    if (counts.get(next1) && counts.get(next2)) {
      const seqCounts = new Map(counts);
      seqCounts.set(firstTile, seqCounts.get(firstTile) - 1);
      seqCounts.set(next1, seqCounts.get(next1) - 1);
      seqCounts.set(next2, seqCounts.get(next2) - 1);

      // Remove tiles with count 0
      [firstTile, next1, next2].forEach(t => {
        if (seqCounts.get(t) === 0) {
          seqCounts.delete(t);
        }
      });

      if (canFormMelds(seqCounts)) {
        return true;
      }
    }
  }

  return false;
}


/**
 * Checks if a given hand is a winning Mahjong hand (4 melds and 1 pair).
 * @param {Array<Object>} hand - A hand of 14 tiles.
 * @returns {boolean} True if the hand is a winning hand, false otherwise.
 */
export function isWinningHand(hand) {
  if (hand.length !== 14) {
    return false;
  }

  const counts = getTileCounts(hand);
  const pairs = [...counts.entries()].filter(([, count]) => count >= 2).map(([tile]) => tile);

  if (pairs.length === 0 && counts.size !== 7) { // Special case for 7 pairs is not handled here
      return false;
  }

  // Check for standard win (4 melds, 1 pair)
  for (const pairTile of pairs) {
    const remainingCounts = new Map(counts);
    remainingCounts.set(pairTile, remainingCounts.get(pairTile) - 2);
    if (remainingCounts.get(pairTile) === 0) {
      remainingCounts.delete(pairTile);
    }

    if (canFormMelds(remainingCounts)) {
      return true;
    }
  }

  // Note: This basic implementation does not check for special hands like "Thirteen Orphans" or "Seven Pairs".
  return false;
}
