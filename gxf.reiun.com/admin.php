<?php
$dsn = 'mysql:dbname=ssreiun_gxf;host=localhost;charset=utf8mb4';
$user = 'ssreiun_2030';
$password = 'Reiun1130';

$message = '';
$error = '';

try {
    $dbh = new PDO($dsn, $user, $password);
    $dbh->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // POST処理（初期化リクエストなど）のハンドリング
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = isset($_POST['action']) ? $_POST['action'] : '';

        if ($action === 'clear_logs') {
            // ログの初期化（全削除）
            $stmt = $dbh->query('TRUNCATE TABLE room_logs');
            
            // 初期化した事実を最初のログとして1件刻む（任意）
            $logSql = "INSERT INTO room_logs (room_number, action_type, message) VALUES ('0', 'delete', '管理画面より、変更履歴ログが初期化されました。')";
            $dbh->query($logSql);
            
            $message = '変更履歴ログを初期化しました。';
        } elseif ($action === 'clear_rooms') {
            // 部屋情報の一括クリア
            $dbh->query('DELETE FROM rooms');
            
            // ログテーブルがあればクリアされた旨を記録
            try {
                $logSql = "INSERT INTO room_logs (room_number, action_type, message) VALUES ('0', 'delete', '管理画面より、すべての部屋情報が一括クリアされました。')";
                $dbh->query($logSql);
            } catch (Exception $e) {}

            $message = 'すべての部屋情報をクリアしました。';
        }
    }

    // 現在の件数を取得して画面に表示する
    $stmt_logs = $dbh->query('SELECT COUNT(*) FROM room_logs');
    $log_count = $stmt_logs->fetchColumn();

    $stmt_rooms = $dbh->query("SELECT COUNT(*) FROM rooms WHERE room_number != '0'");
    $room_count = $stmt_rooms->fetchColumn();

} catch (PDOException $e) {
    $error = 'データベースエラー: ' . $e->getMessage();
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>システム管理</title>
    <link rel="stylesheet" href="style.css?v=<?php echo time(); ?>">
    <link rel="icon" href="favicon.png?v=<?php echo time(); ?>" type="image/png">
</head>
<body>

<div class="menu-wrapper">
    <button class="btn-menu" id="menuBtn" title="メニュー">☰</button>
    <div class="dropdown-menu" id="dropdownMenu">
        <a href="index.php" class="dropdown-item">部屋管理</a>
        <a href="log.php" class="dropdown-item">ログ</a>
        <a href="admin.php" class="dropdown-item">システム</a>
    </div>
</div>

<div class="container log-container">
    <h1>システム管理・メンテナンス</h1>

    <?php if ($message): ?>
        <div class="alert-success"><?php echo htmlspecialchars($message, ENT_QUOTES, 'UTF-8'); ?></div>
    <?php endif; ?>
    
    <?php if ($error): ?>
        <div class="alert-error"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></div>
    <?php endif; ?>

    <div class="admin-card">
        <h2>現在のシステムステータス</h2>
        <div class="admin-status">
            <div class="status-item">
                <div>保持されている部屋数</div>
                <div class="status-number"><?php echo intval($room_count); ?> 件</div>
            </div>
            <div class="status-item">
                <div>蓄積されたログ件数</div>
                <div class="status-number"><?php echo intval($log_count); ?> 件</div>
            </div>
        </div>
    </div>

    <div class="admin-card">
        <div class="admin-actions">
            <h3>変更履歴ログの初期化</h3>
            <p style="font-size: 0.9rem; color: #8b949e; margin-bottom: 15px;">
                データベース内の `room_logs` テーブルを完全に空にします。過去の登録・削除の履歴データはすべて削除されます。
            </p>
            <form action="admin.php" method="POST" onsubmit="return confirm('本当にログ履歴をすべて初期化してもよろしいですか？この操作は取り消せません。');">
                <input type="hidden" name="action" value="clear_logs">
                <button type="submit" class="btn-danger">ログ履歴をすべて初期化</button>
            </form>
        </div>
    </div>

    <div class="admin-card">
        <div class="admin-actions">
            <h3>アクティブ部屋情報の一括クリア</h3>
            <p style="font-size: 0.9rem; color: #8b949e; margin-bottom: 15px;">
                現在画面に表示されているすべての部屋データ（roomsテーブル）を強制的に一括削除します。
            </p>
            <form action="admin.php" method="POST" onsubmit="return confirm('現在保持されているすべての部屋データをクリアしますか？');">
                <input type="hidden" name="action" value="clear_rooms">
                <button type="submit" class="btn-danger">部屋データを一括クリア</button>
            </form>
        </div>
    </div>
</div>

<script>
const menuBtn = document.getElementById('menuBtn');
const dropdownMenu = document.getElementById('dropdownMenu');

menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('show');
});

document.addEventListener('click', (e) => {
    if (!dropdownMenu.contains(e.target) && e.target !== menuBtn) {
        dropdownMenu.classList.remove('show');
    }
});
</script>
</body>
</html>