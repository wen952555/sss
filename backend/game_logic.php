<?php
// backend/game_logic.php
class Shisanshui {
    private static $vMap = ['2'=>2,'3'=>3,'4'=>4,'5'=>5,'6'=>6,'7'=>7,'8'=>8,'9'=>9,'10'=>10,'jack'=>11,'queen'=>12,'king'=>13,'ace'=>14];

    public static function autoSort($cards) {
        $parsed = [];
        foreach ($cards as $c) {
            preg_match('/(.*)_of_(.*)\.svg/', $c, $m);
            $parsed[] = ['file' => $c, 'v' => self::$vMap[$m[1]]];
        }
        usort($parsed, function($a, $b) { return $b['v'] - $a['v']; });
        $f = array_column($parsed, 'file');
        return ['back'=>array_slice($f,0,5), 'mid'=>array_slice($f,5,5), 'front'=>array_slice($f,10,3)];
    }

    public static function getHandScore($cards) {
        if (empty($cards)) return 0;
        $parsed = [];
        foreach ($cards as $c) {
            preg_match('/(.*)_of_(.*)\.svg/', $c, $m);
            $parsed[] = ['v' => self::$vMap[$m[1]]];
        }
        usort($parsed, function($a, $b) { return $b['v'] - $a['v']; });
        $v = array_column($parsed, 'v');
        $counts = array_count_values($v);
        arsort($counts);
        $rank = 1;
        if (reset($counts) === 4) $rank = 8;
        else if (reset($counts) === 3 && count($counts) === 2) $rank = 7;
        else if (reset($counts) === 3) $rank = 4;
        else if (reset($counts) === 2) $rank = count($counts) === 3 ? 3 : 2;
        
        $score = $rank * 100000000;
        foreach ($v as $i => $val) $score += $val * pow(15, 5-$i);
        return $score;
    }
}