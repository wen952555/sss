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
