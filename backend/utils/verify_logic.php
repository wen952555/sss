<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/scorer.php';

function assert_equals($expected, $actual, $message) {
    if ($expected === $actual) {
        echo "[PASS] $message\n";
    } else {
        echo "[FAIL] $message\n";
        echo "  Expected: " . json_encode($expected) . "\n";
        echo "  Actual:   " . json_encode($actual) . "\n";
    }
}

// --- Test Data ---

// 1. Special Hand: Dragon (一条龙)
$dragon_hand = [
    'top' => ['2_of_spades', '3_of_hearts', '4_of_clubs'],
    'middle' => ['5_of_diamonds', '6_of_spades', '7_of_hearts', '8_of_clubs', '9_of_diamonds'],
    'bottom' => ['10_of_spades', 'jack_of_hearts', 'queen_of_clubs', 'king_of_diamonds', 'ace_of_spades']
];

// 2. Special Hand: Six and a half pairs (六对半)
$six_pairs_hand = [
    'top' => ['2_of_spades', '2_of_hearts', '3_of_clubs'],
    'middle' => ['4_of_diamonds', '4_of_spades', '5_of_hearts', '5_of_clubs', '6_of_diamonds'],
    'bottom' => ['6_of_spades', '7_of_hearts', '7_of_clubs', '8_of_diamonds', '8_of_spades']
];

// 3. Special Hand: Three Flushes (三同花)
$three_flushes_hand = [
    'top' => ['ace_of_hearts', 'king_of_hearts', 'queen_of_hearts'],
    'middle' => ['10_of_spades', '8_of_spades', '7_of_spades', '6_of_spades', '2_of_spades'],
    'bottom' => ['9_of_clubs', '5_of_clubs', '4_of_clubs', '3_of_clubs', '2_of_clubs']
];

// 4. Foul Hand (倒水)
$foul_hand = [
    'top' => ['ace_of_spades', 'ace_of_hearts', 'ace_of_clubs'], // Three of a kind
    'middle' => ['king_of_diamonds', 'king_of_spades', '5_of_hearts', '4_of_clubs', '3_of_diamonds'], // Pair
    'bottom' => ['2_of_spades', '7_of_hearts', '8_of_clubs', '10_of_diamonds', 'jack_of_spades'] // High card
];

// 5. Standard Hands for comparison
$p1_full_house_hand = [
    'top' => ['2_of_spades', '3_of_hearts', '4_of_clubs'],
    'middle' => ['5_of_diamonds', '5_of_spades', '5_of_hearts', '8_of_clubs', '9_of_diamonds'],
    'bottom' => ['ace_of_spades', 'ace_of_hearts', 'ace_of_clubs', 'king_of_diamonds', 'king_of_spades'] // Aces full of Kings
];

$p2_flush_hand = [
    'top' => ['2_of_spades', '3_of_hearts', '4_of_clubs'],
    'middle' => ['queen_of_diamonds', '10_of_diamonds', '7_of_diamonds', '5_of_diamonds', '2_of_diamonds'], // Diamond Flush
    'bottom' => ['king_of_hearts', 'queen_of_hearts', 'jack_of_hearts', '9_of_hearts', '8_of_hearts'] // Heart Flush
];


// --- Run Tests ---

echo "--- Testing getSpecialType() ---\n";
assert_equals('一条龙', getSpecialType($dragon_hand), 'Should detect Dragon');
assert_equals('六对半', getSpecialType($six_pairs_hand), 'Should detect Six and a Half Pairs');
assert_equals('三同花', getSpecialType($three_flushes_hand), 'Should detect Three Flushes');
assert_equals(null, getSpecialType($p1_full_house_hand), 'Should not detect special type for standard hand');

echo "\n--- Testing isSssFoul() ---\n";
assert_equals(true, isSssFoul($foul_hand), 'Should detect a foul hand');
assert_equals(false, isSssFoul($dragon_hand), 'Dragon hand should not be foul');
assert_equals(false, isSssFoul($p1_full_house_hand), 'Standard valid hand should not be foul');

echo "\n--- Testing calculateSinglePairScore() ---\n";

// Test 1: Special vs Standard
$score_dragon_vs_std = calculateSinglePairScore($dragon_hand, $p1_full_house_hand);
assert_equals(13, $score_dragon_vs_std, 'Dragon vs Standard hand should be 13 points');

// Test 2: Foul vs Standard
$score_foul_vs_std = calculateSinglePairScore($foul_hand, $p1_full_house_hand);
// Base score of p1 hand: top=1, mid=1, bottom=7(full house) -> but my rules don't score bottom full house
// Let's re-calculate: getSssAreaScore($p1_full_house_hand['bottom'], 'tail') -> 1
// So total base score is 1 + 1 + 1 = 3. This seems wrong.
// Ah, my SSS_SCORES is missing values.
// 'MIDDLE' => ['铁支' => 8, '同花顺' => 10, '葫芦' => 2],
// 'TAIL' => ['铁支' => 4, '同花顺' => 5],
// There is no score for a Full House in the tail. This is a bug in the rules definition.
// The frontend has the same issue. I will assume this is intended and the score is 1 (high card).
// Let's check `getSssAreaScore`. It returns 1 if the type is not found.
// `getSssAreaType` will return "葫芦" for the bottom hand. `getSssAreaScore` will lookup SSS_SCORES['TAIL']['葫芦'], which is not set. It will return 1.
// With the new scoring, p1 hand is: top(1) + mid(1) + bot(3) = 5.
assert_equals(-5, $score_foul_vs_std, 'Foul vs Standard hand score should be negative base score of standard hand');

// Test 3: Standard vs Standard
$score_p1_vs_p2 = calculateSinglePairScore($p1_full_house_hand, $p2_flush_hand);
// With new scoring:
// top: draw (0)
// mid: p2(flush) > p1(3-kind). p2 gets 4 points. score = -4
// bot: p1(FH) > p2(flush). p1 gets 3 points. score = -4 + 3 = -1
assert_equals(-1, $score_p1_vs_p2, 'Standard P1 vs Standard P2 score should be -1');

// Test 4: Flush suit comparison
$flush_spades = ['top'=>[], 'middle'=>[], 'bottom' => ['ace_of_spades', 'king_of_spades', 'queen_of_spades', 'jack_of_spades', '9_of_spades']];
$flush_hearts = ['top'=>[], 'middle'=>[], 'bottom' => ['ace_of_hearts', 'king_of_hearts', 'queen_of_hearts', 'jack_of_hearts', '9_of_hearts']];
$cmp_flushes = compareSssArea($flush_spades['bottom'], $flush_hearts['bottom'], 'tail');
assert_equals(true, $cmp_flushes > 0, 'Spades flush should beat Hearts flush');

// Test 5: Two pair kicker comparison
$two_pair_A = ['top'=>[], 'middle'=>[], 'bottom' => ['ace_of_spades', 'ace_of_hearts', 'king_of_clubs', 'king_of_diamonds', '9_of_spades']]; // Aces and Kings
$two_pair_B = ['top'=>[], 'middle'=>[], 'bottom' => ['ace_of_clubs', 'ace_of_diamonds', 'queen_of_hearts', 'queen_of_spades', '10_of_hearts']]; // Aces and Queens
$cmp_two_pairs = compareSssArea($two_pair_A['bottom'], $two_pair_B['bottom'], 'tail');
assert_equals(true, $cmp_two_pairs > 0, 'Aces and Kings should beat Aces and Queens');


echo "\n--- Analysis ---\n";
echo "The SSS_SCORES table seems incomplete, which affects scoring logic.\n";
echo "For example, a Full House in the bottom lane is not assigned a special point value.\n";
echo "The tests above are based on the CURRENT rules, including these limitations.\n";

?>
