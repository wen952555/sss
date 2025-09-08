import { evaluateHand, parseCard, HAND_TYPES, compareHands } from './pokerEvaluator.js';

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    console.error(`Assertion failed: ${message}`);
    console.error(`  Expected: ${expected}`);
    console.error(`  Actual:   ${actual}`);
    process.exit(1);
  }
}

function assertDeepEqual(actual, expected, message) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
      console.error(`Assertion failed: ${message}`);
      console.error(`  Expected: ${expectedStr}`);
      console.error(`  Actual:   ${actualStr}`);
      process.exit(1);
    }
  }

function test() {
  console.log('Running tests for pokerEvaluator.js...');

  // Test case 1: 3-card Ace-low straight (A-2-3) - This should fail before the fix
  const aceLowStraight3 = ['ace_of_spades', '2_of_hearts', '3_of_clubs'].map(parseCard);
  let result = evaluateHand(aceLowStraight3);
  assertEqual(result.name, HAND_TYPES.STRAIGHT.name, 'Test Case 1 Failed: A-2-3 should be a Straight');
  assertDeepEqual(result.values, [3, 2, 1], 'Test Case 1 Failed: A-2-3 straight values should be [3, 2, 1]');
  console.log('Test Case 1 Passed: 3-card Ace-low straight');

  // Test case 2: 4-card Ace-low straight (A-2-3-4)
  const aceLowStraight4 = ['ace_of_spades', '2_of_hearts', '3_of_clubs', '4_of_diamonds'].map(parseCard);
  result = evaluateHand(aceLowStraight4);
  assertEqual(result.name, HAND_TYPES.STRAIGHT.name, 'Test Case 2 Failed: A-2-3-4 should be a Straight');
  assertDeepEqual(result.values, [4, 3, 2, 1], 'Test Case 2 Failed: A-2-3-4 straight values should be [4, 3, 2, 1]');
  console.log('Test Case 2 Passed: 4-card Ace-low straight');

  // Test case 3: 5-card Ace-low straight (A-2-3-4-5)
  const aceLowStraight5 = ['ace_of_spades', '2_of_hearts', '3_of_clubs', '4_of_diamonds', '5_of_spades'].map(parseCard);
  result = evaluateHand(aceLowStraight5);
  assertEqual(result.name, HAND_TYPES.STRAIGHT.name, 'Test Case 3 Failed: A-2-3-4-5 should be a Straight');
  assertDeepEqual(result.values, [5, 4, 3, 2, 1], 'Test Case 3 Failed: A-2-3-4-5 straight values should be [5, 4, 3, 2, 1]');
  console.log('Test Case 3 Passed: 5-card Ace-low straight');

  // Test case 4: Standard straight (2-3-4)
  const standardStraight = ['2_of_hearts', '3_of_clubs', '4_of_diamonds'].map(parseCard);
  result = evaluateHand(standardStraight);
  assertEqual(result.name, HAND_TYPES.STRAIGHT.name, 'Test Case 4 Failed: 2-3-4 should be a Straight');
  console.log('Test Case 4 Passed: Standard straight');

  // Test case 5: Straight comparison
  const kingHighStraight = evaluateHand(['10_of_spades', 'jack_of_hearts', 'queen_of_clubs', 'king_of_diamonds'].map(parseCard));
  const aceLowStraight = evaluateHand(['ace_of_spades', '2_of_hearts', '3_of_clubs', '4_of_diamonds'].map(parseCard));
  const comparison = compareHands(kingHighStraight, aceLowStraight);
  assertEqual(comparison > 0, true, 'Test Case 5 Failed: K-high straight should be greater than A-low straight');
  console.log('Test Case 5 Passed: Straight comparison');

  console.log('All tests passed!');
}

test();
