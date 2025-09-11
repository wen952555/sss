import {
  calculateSinglePairScore,
  isSssFoul,
  getSpecialType,
  compareSssArea,
} from './src/utils/scorer.js';

function runTest(name, testFunction) {
  try {
    testFunction((condition, message) => {
      if (!condition) {
        throw new Error(message || 'Assertion failed');
      }
    });
    console.log(`✅ Test passed: ${name}`);
  } catch (error) {
    console.error(`❌ Test failed: ${name}`);
    console.error(error);
    process.exit(1);
  }
}

runTest('isSssFoul should return true for a foul hand', (assert) => {
  const foulHand = {
    top: ['king_of_spades', 'king_of_hearts', 'king_of_clubs'], // Three of a kind
    middle: ['2_of_spades', '3_of_spades', '4_of_spades', '5_of_spades', '6_of_spades'], // Straight
    bottom: ['ace_of_spades', 'ace_of_hearts', '2_of_clubs', '3_of_diamonds', '4_of_hearts'], // High card
  };
  assert(isSssFoul(foulHand) === true, 'Foul hand not detected');
});

runTest('isSssFoul should return false for a valid hand', (assert) => {
  const validHand = {
    top: ['2_of_spades', '3_of_hearts', '4_of_clubs'],
    middle: ['5_of_spades', '5_of_hearts', '6_of_clubs', '7_of_spades', '8_of_spades'],
    bottom: ['ace_of_spades', 'ace_of_hearts', 'ace_of_clubs', 'king_of_spades', 'king_of_hearts'],
  };
  assert(isSssFoul(validHand) === false, 'Valid hand detected as foul');
});

runTest('getSpecialType should identify "一条龙"', (assert) => {
    const dragonHand = {
        top: ['2_of_diamonds', '3_of_hearts', '4_of_spades'],
        middle: ['5_of_clubs', '6_of_diamonds', '7_of_hearts', '8_of_spades', '9_of_clubs'],
        bottom: ['10_of_diamonds', 'jack_of_hearts', 'queen_of_spades', 'king_of_clubs', 'ace_of_diamonds'],
    };
    assert(getSpecialType(dragonHand) === '一条龙', 'Dragon special type not detected');
});

runTest('calculateSinglePairScore should score a simple hand correctly', (assert) => {
  const hand1 = {
    top: ['ace_of_spades', 'king_of_hearts', 'queen_of_clubs'],
    middle: ['2_of_spades', '3_of_spades', '4_of_spades', '5_of_spades', '7_of_spades'],
    bottom: ['8_of_spades', '8_of_hearts', '8_of_clubs', 'jack_of_spades', 'jack_of_hearts'],
  };
  const hand2 = {
    top: ['2_of_clubs', '3_of_diamonds', '5_of_hearts'],
    middle: ['ace_of_clubs', 'king_of_diamonds', 'queen_of_hearts', 'jack_of_clubs', '9_of_diamonds'],
    bottom: ['10_of_clubs', '10_of_diamonds', '10_of_hearts', 'king_of_clubs', 'king_of_diamonds'],
  };

  const score = calculateSinglePairScore(hand1, hand2);
  assert(score === 1, `Simple hand score incorrect, expected 1, got ${score}`);
});

runTest('compareSssArea should rank straights correctly', (assert) => {
    const aceHighStraight = {
        top: [],
        middle: ['10_of_clubs', 'jack_of_diamonds', 'queen_of_hearts', 'king_of_spades', 'ace_of_clubs'],
        bottom: [],
    };
    const aceLowStraight = {
        top: [],
        middle: ['ace_of_diamonds', '2_of_hearts', '3_of_spades', '4_of_clubs', '5_of_diamonds'],
        bottom: [],
    };
    const kingHighStraight = {
        top: [],
        middle: ['9_of_hearts', '10_of_spades', 'jack_of_clubs', 'queen_of_diamonds', 'king_of_hearts'],
        bottom: [],
    };

    assert(compareSssArea(aceHighStraight.middle, kingHighStraight.middle, 'middle') > 0, 'A-high straight should beat K-high straight');
    assert(compareSssArea(aceLowStraight.middle, kingHighStraight.middle, 'middle') > 0, 'A-low straight should beat K-high straight');
    assert(compareSssArea(aceHighStraight.middle, aceLowStraight.middle, 'middle') > 0, 'A-high straight should beat A-low straight');
});

console.log('All scorer tests passed!');
