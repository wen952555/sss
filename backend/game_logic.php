<?php
/**
 * 路径: backend/game_logic.php
 */
class Shisanshui {
    private static $vMap = ['2'=>2,'3'=>3,'4'=>4,'5'=>5,'6'=>6,'7'=>7,'8'=>8,'9'=>9,'10'=>10,'jack'=>11,'queen'=>12,'king'=>13,'ace'=>14];

    public static function getHandScore($cards) {
        $analysis = self::analyze($cards);
        $score = $analysis['rank'] * 10000000000;
        foreach ($analysis['powers'] as $i => $v) {
            $score += $v * pow(15, (5 - $i));
        }
        return $score;
    }

    private static function analyze($cards) {
        $parsed = [];
        foreach ($cards as $c) {
            preg_match('/(.*)_of_(.*)\.svg/', $c, $m);
            $parsed[] = ['v' => self::$vMap[$m[1]], 's' => $m[2]];
        }
        usort($parsed, function($a, $b) { return $b['v'] - $a['v']; });
        $v = array_column($parsed, 'v');
        $s = array_column($parsed, 's');
        $counts = array_count_values($v);
        arsort($counts);

        $isFlush = count(array_unique($s)) === 1;
        $isStraight = false;
        if (count($v) === 5) {
            $uV = array_values(array_unique($v));
            if (count($uV) === 5 && ($uV[0] - $uV[4] === 4)) $isStraight = true;
            if (count($uV) === 5 && $v[0]==14 && $v[1]==5 && $v[4]==2) $isStraight = true; // A2345
        }

        if (count($cards) === 5) {
            if ($isFlush && $isStraight) return ['rank'=>9, 'powers'=>$v];
            if (reset($counts) === 4) return ['rank'=>8, 'powers'=>[key($counts)]];
            if (reset($counts) === 3 && count($counts) === 2) return ['rank'=>7, 'powers'=>[key($counts)]];
            if ($isFlush) return ['rank'=>6, 'powers'=>$v];
            if ($isStraight) return ['rank'=>5, 'powers'=>$v];
        }
        if (reset($counts) === 3) return ['rank'=>4, 'powers'=>[key($counts)]];
        if (reset($counts) === 2) {
            $p = []; foreach($counts as $val=>$num) if($num==2) $p[]=$val;
            if (count($p)==2) return ['rank'=>3, 'powers'=>[max($p), min($p), key(array_filter($counts, fn($n)=>$n==1))]];
            return ['rank'=>2, 'powers'=>[key($counts), ...array_diff($v, [key($counts)])]];
        }
        return ['rank'=>1, 'powers'=>$v];
    }
}
