<?php
define('API_KEY', 'ervha2decline3r'); 

$dsn = 'mysql:dbname=ssreiun_gxf;host=localhost;charset=utf8mb4';
$user = 'ssreiun_2030';
$password = 'Reiun1130';

$action = isset($_POST['action']) ? $_POST['action'] : '';
$room = isset($_POST['room_number']) ? trim($_POST['room_number']) : '';
$display_text = isset($_POST['display_text']) ? trim($_POST['display_text']) : '';
$auth_key = isset($_POST['api_key']) ? $_POST['api_key'] : '';

if ($auth_key !== API_KEY) {
    http_response_code(403);
    die(json_encode(["error" => "認証エラー"]));
}

try {
    $dbh = new PDO($dsn, $user, $password);
    $dbh->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // 【部屋の追加】ステータス同期処理を削除し、純粋な追加のみにする
    if ($action === 'add') {
        if ($room === '' || $room === null) {
            http_response_code(400);
            die(json_encode(["error" => "部屋番号が不足しています"]));
        }

        // rooms テーブルには部屋番号のみを保存
        $sql = 'INSERT IGNORE INTO rooms (room_number) VALUES (?)';
        $stmt = $dbh->prepare($sql);
        $stmt->execute([$room]);

        $logSql = "INSERT INTO room_logs (room_number, action_type, message) VALUES (?, 'register', ?)";
        $logStmt = $dbh->prepare($logSql);
        $logStmt->execute([$room, "部屋 No.{$room} が新しく登録されました。"]);

        echo json_encode(["status" => "success", "message" => "added"]);
        
    } elseif ($action === 'delete') {
        if ($room === '' || $room === null) {
            http_response_code(400);
            die(json_encode(["error" => "部屋番号が不足しています"]));
        }

        $logSql = "INSERT INTO room_logs (room_number, action_type, message) VALUES (?, 'delete', ?)";
        $logStmt = $dbh->prepare($logSql);
        $logStmt->execute([$room, "部屋 No.{$room} の処理が完了しました。"]);

        $sql = 'DELETE FROM rooms WHERE room_number = ?';
        $stmt = $dbh->prepare($sql);
        $stmt->execute([$room]);

        echo json_encode(["status" => "success", "message" => "deleted"]);
        
    } elseif ($action === 'update_all') {
        $logSql = "INSERT INTO room_logs (room_number, action_type, message) VALUES ('0', 'delete', 'すべての部屋が処理されました。')";
        $dbh->query($logSql);

        $sql = 'DELETE FROM rooms';
        $dbh->query($sql);

        echo json_encode(["status" => "success", "message" => "cleared"]);

    } elseif ($action === 'update_status') {
        // 全体ステータスの更新はここだけで完結させる
        $sql = "INSERT INTO status_board (key_name, display_text) VALUES ('main_status', ?) 
                ON DUPLICATE KEY UPDATE display_text = ?";
        $stmt = $dbh->prepare($sql);
        $stmt->execute([$display_text, $display_text]);
        
        echo json_encode(["status" => "success", "message" => "status updated"]);
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "DBエラー: " . $e->getMessage()]);
}