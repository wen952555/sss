<?php
// backend/app/services/PointService.php
namespace App\Services;

use App\Core\Database;
use App\Models\User; // If needed for direct user model interactions
use PDO;

class PointService {
    private $db;
    private $userModel;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
        $this->userModel = new User();
    }

    /**
     * Atomically transfers points from one user to another.
     * @param int $fromUserId
     * @param int $toUserId
     * @param int $amount
     * @param string $transactionType Type of transaction (e.g., 'gift', 'game_win', 'admin_adjust')
     * @param int|null $adminId If an admin adjustment, the admin's user ID (can be system ID)
     * @return bool
     * @throws \Exception
     */
    public function transferPoints(int $fromUserId, int $toUserId, int $amount, string $transactionType = 'gift', ?int $adminId = null): bool {
        if ($amount <= 0) {
            throw new \Exception("Amount must be positive.");
        }

        $this->db->beginTransaction();

        try {
            // Get sender's points
            $stmt = $this->db->prepare("SELECT points FROM users WHERE id = :id FOR UPDATE"); // Lock row
            $stmt->execute(['id' => $fromUserId]);
            $sender = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$sender) {
                throw new \Exception("Sender not found.");
            }
            if ($sender['points'] < $amount) {
                throw new \Exception("Insufficient points.");
            }

            // Get recipient's points
            $stmt = $this->db->prepare("SELECT points FROM users WHERE id = :id FOR UPDATE"); // Lock row
            $stmt->execute(['id' => $toUserId]);
            $recipient = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$recipient) {
                throw new \Exception("Recipient not found.");
            }

            // Deduct from sender
            $newSenderPoints = $sender['points'] - $amount;
            $stmt = $this->db->prepare("UPDATE users SET points = :points WHERE id = :id");
            $stmt->execute(['points' => $newSenderPoints, 'id' => $fromUserId]);

            // Add to recipient
            $newRecipientPoints = $recipient['points'] + $amount;
            $stmt = $this->db->prepare("UPDATE users SET points = :points WHERE id = :id");
            $stmt->execute(['points' => $newRecipientPoints, 'id' => $toUserId]);

            // Log transaction
            $stmt = $this->db->prepare("INSERT INTO point_transactions (from_user_id, to_user_id, amount, transaction_type) VALUES (:from_id, :to_id, :amount, :type)");
            $stmt->execute([
                'from_id' => $fromUserId,
                'to_id' => $toUserId,
                'amount' => $amount,
                'type' => $transactionType
            ]);

            $this->db->commit();
            return true;

        } catch (\Exception $e) {
            $this->db->rollBack();
            error_log("Point transfer error: " . $e->getMessage());
            throw $e; // Re-throw to be caught by controller
        }
    }

    /**
     * Adjusts a user's points (e.g., by an admin or system).
     * @param int $userId
     * @param int $amountChange Positive to add, negative to subtract.
     * @param string $reason Usually 'admin_adjust' or 'game_reward', 'system_correction'
     * @param int|null $adminPerformingActionId For logging who did it
     * @return bool
     * @throws \Exception
     */
    public function adjustUserPoints(int $userId, int $amountChange, string $reason = 'admin_adjust', ?int $adminPerformingActionId = null): bool {
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("SELECT points FROM users WHERE id = :id FOR UPDATE");
            $stmt->execute(['id' => $userId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                throw new \Exception("User not found for point adjustment.");
            }

            $newPoints = $user['points'] + $amountChange;
            if ($newPoints < 0) {
                // Decide policy: disallow negative points or set to 0?
                // For now, disallow going below 0 from adjustment.
                // Or allow it and let game logic handle it.
                // Let's assume points can't go below 0 from an adjustment.
                // $newPoints = max(0, $newPoints);
                // For this example, we'll allow it to go negative if that's the change,
                // but typically a game would prevent this or have a "bankruptcy" state.
                // For now, we allow it, but in a real game, add a check:
                // if ($newPoints < 0 && $reason != 'some_penalty_allowing_negative') {
                //    throw new \Exception("Points cannot go below zero for this type of adjustment.");
                // }
            }
            
            $stmtUpdate = $this->db->prepare("UPDATE users SET points = :points WHERE id = :id");
            $stmtUpdate->execute(['points' => $newPoints, 'id' => $userId]);

            // Log transaction (system as sender if $adminPerformingActionId is null or for game rewards)
            // Using a placeholder system user ID like 0 or -1 if no specific admin.
            $fromUserIdForLog = $adminPerformingActionId ?? 0; // 0 for system/game
            
            $stmtLog = $this->db->prepare("INSERT INTO point_transactions (from_user_id, to_user_id, amount, transaction_type) VALUES (:from_id, :to_id, :amount, :type)");
            $stmtLog->execute([
                'from_id' => $amountChange > 0 ? $fromUserIdForLog : $userId, // if adding, system/admin is "from", if deducting, user is "from"
                'to_id' => $amountChange > 0 ? $userId : $fromUserIdForLog,   // if adding, user is "to", if deducting, system/admin is "to"
                'amount' => abs($amountChange),
                'type' => $reason
            ]);

            $this->db->commit();
            return true;
        } catch (\Exception $e) {
            $this->db->rollBack();
            error_log("Point adjustment error for user $userId: " . $e->getMessage());
            throw $e;
        }
    }
}
?>
