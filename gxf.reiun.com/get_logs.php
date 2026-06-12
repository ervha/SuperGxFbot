<?php
$dsn = 'mysql:dbname=ssreiun_gxf;host=localhost;charset=utf8mb4';
$user = 'ssreiun_2030';
$password = 'Reiun1130';

header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_ACTIVE) {
    session_write_close();
}

set_time_limit(60);

$last_known_id = isset($_GET['last_id']) ? intval($_GET['last_id']) : 0;

$timeout_seconds = 30;
$start_time = time();

try {
    $dbh = new PDO($dsn, $user, $password);
    
    while (true) {
        $stmt = $dbh->query('SELECT MAX(id) as max_id FROM room_logs');
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $current_max_id = $row['max_id'] ? intval($row['max_id']) : 0;

        if ($last_known_id === 0 || $current_max_id > $last_known_id) {
            // 最新50件を一度IDの大きい順に取ってから、外側で古い順（id ASC）に並び替える
            $sql = 'SELECT * FROM (
                        SELECT id, room_number, action_type, message, 
                               DATE_FORMAT(created_at, "%Y/%m/%d %H:%i:%s") as formatted_time 
                        FROM room_logs 
                        ORDER BY id DESC 
                        LIMIT 50
                    ) sub
                    ORDER BY id ASC';
            $stmt = $dbh->query($sql);
            $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "status" => "success",
                "max_id" => $current_max_id,
                "logs" => $logs
            ]);
            exit;
        }

        if ((time() - $start_time) >= $timeout_seconds) {
            echo json_encode([
                "status" => "no_change",
                "max_id" => $current_max_id,
                "logs" => []
            ]);
            exit;
        }

        usleep(500000);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}