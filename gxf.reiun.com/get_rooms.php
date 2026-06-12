<?php
$dsn = 'mysql:dbname=ssreiun_gxf;host=localhost;charset=utf8mb4';
$user = 'ssreiun_2030';
$password = 'Reiun1130';

header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_ACTIVE) {
    session_write_close();
}

set_time_limit(60);
$last_known_version = isset($_GET['v']) ? $_GET['v'] : '';
$start_time = time();

try {
    $dbh = new PDO($dsn, $user, $password);
    
    while (true) {
        // 部屋一覧を取得
        $stmtRooms = $dbh->query('SELECT room_number FROM rooms WHERE room_number != "0"');
        $rooms = $stmtRooms->fetchAll(PDO::FETCH_ASSOC);
        
        $stmtStatus = $dbh->query("SELECT display_text FROM status_board WHERE key_name = 'main_status'");
        $status = $stmtStatus->fetch(PDO::FETCH_ASSOC);
        $status_text = $status ? $status['display_text'] : "処理待ちの部屋はありません";

        $rooms[] = ["room_number" => "0", "display_text" => $status_text];
        
        $current_version = md5(json_encode($rooms));

        if ($last_known_version === '' || $current_version !== $last_known_version) {
            echo json_encode([ "status" => "success", "version" => $current_version, "rooms" => $rooms]);
            exit;
        }

        if ((time() - $start_time) >= 30) {
            echo json_encode(["status" => "no_change", "version" => $last_known_version]);
            exit;
        }
        usleep(500000);
    }
} catch (Exception $e) {
    echo json_encode(["status" => "error"]);
}