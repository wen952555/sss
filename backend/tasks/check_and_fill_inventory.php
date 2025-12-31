<?php
require_once __DIR__ . '/../db.php';

const TARGET_STADIUMS = 96; // 目标库存：96个场次
const TRIGGER_STADIUMS = 32; // 触发线：32个场次

function create_deck() {
    $suits = ['S', 'H', 'D', 'C']; // Spades, Hearts, Diamonds, Clubs
    $ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
    $deck = [];
    foreach ($suits as $suit) {
        foreach ($ranks as $rank) {
            $deck[] = $suit . $rank;
        }
    }
    return $deck;
}

function deal_hands($deck) {
    shuffle($deck);
    return [
        'north' => array_slice($deck, 0, 13),
        'east'  => array_slice($deck, 13, 13),
        'south' => array_slice($deck, 26, 13),
        'west'  => array_slice($deck, 39, 13)
    ];
}

// --- Main Logic ---
try {
    $stmt = $pdo->query("SELECT COUNT(*) FROM stadiums WHERE status = 'available'");
    $available_stadiums = $stmt->fetchColumn();

    if ($available_stadiums < TRIGGER_STADIUMS) {
        $needed_stadiums = TARGET_STADIUMS - $available_stadiums;
        echo "Available stadiums ($available_stadiums) are below the trigger point ($TRIGGER_STADIUMS). Need to create $needed_stadiums new stadiums.\n";

        $pdo->beginTransaction();

        for ($i = 0; $i < $needed_stadiums; $i++) {
            // 1. Create a new stadium
            $stadium_sql = "INSERT INTO stadiums (status) VALUES ('available')";
            $pdo->exec($stadium_sql);
            $stadium_id = $pdo->lastInsertId();

            // 2. Create 10 deals for this stadium
            $deal_sql = "INSERT INTO stadium_deals (stadium_id, deal_index, hands) VALUES (?, ?, ?)";
            $deal_stmt = $pdo->prepare($deal_sql);

            for ($j = 1; $j <= 10; $j++) {
                $deck = create_deck();
                $hands = deal_hands($deck);
                $hands_json = json_encode($hands);
                $deal_stmt->execute([$stadium_id, $j, $hands_json]);
            }
            echo "Created Stadium ID: $stadium_id with 10 deals.\n";
        }

        $pdo->commit();
        echo "Inventory fill-up process completed successfully.\n";
    } else {
        echo "Available stadiums ($available_stadiums) are sufficient. No action taken.\n";
    }

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    die("Inventory check and fill failed: " . $e->getMessage());
}
?>