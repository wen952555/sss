<?php
// backend/app/helpers/utils.php
namespace App\Helpers;

class Utils {
    // Fisher-Yates shuffle
    public static function shuffleArray(array &$array): void {
        $n = count($array);
        for ($i = $n - 1; $i > 0; $i--) {
            $j = mt_rand(0, $i);
            [$array[$i], $array[$j]] = [$array[$j], $array[$i]];
        }
    }

    public static function generateRoomCode(int $length = 6): string {
        $characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $charactersLength = strlen($characters);
        $randomString = '';
        for ($i = 0; $i < $length; $i++) {
            $randomString .= $characters[rand(0, $charactersLength - 1)];
        }
        return $randomString;
    }
}
?>
