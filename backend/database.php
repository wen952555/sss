<?php
// backend/database.php

function getDbConnection() {
    try {
        $db = new SQLite3('sss_game.db');
        $db->enableExceptions(true);
        return $db;
    } catch (Exception $e) {
        throw new Exception("Error connecting to database: " . $e->getMessage());
    }
}
