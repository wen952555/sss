/**
 * Parses a card's SVG filename to identify its properties.
 * @param {string} filename - The filename, e.g., "10_of_clubs.svg".
 * @returns {{rank: string, suit: string}|null} An object with card details or null if invalid.
 */
export function parseCardFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return null;
  }

  // Handle Jokers first as they have a unique format.
  if (filename === 'red_joker.svg') {
    // Using 'suit' to hold the color for structural consistency.
    return { rank: 'joker', suit: 'red' };
  }
  if (filename === 'black_joker.svg') {
    return { rank: 'joker', suit: 'black' };
  }

  // Use a regular expression to parse standard card filenames like "ace_of_spades.svg".
  // It captures the rank (e.g., 'ace') and the suit (e.g., 'spades').
  const regex = /^(\w+)_of_(\w+)\.svg$/;
  const match = filename.match(regex);

  if (match && match.length === 3) {
    const rank = match[1];
    const suit = match[2];

    // Optional: Add validation to ensure the parsed rank and suit are valid.
    const validRanks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    const validSuits = ['clubs', 'diamonds', 'hearts', 'spades'];

    if (!validRanks.includes(rank) || !validSuits.includes(suit)) {
      // Return null if the parsed parts are not recognized card values.
      return null;
    }

    return { rank, suit };
  }

  // Return null if the filename doesn't match any of the expected patterns.
  return null;
}
