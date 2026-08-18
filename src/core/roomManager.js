const { getPool } = require('./db');
const roomMutex = require('./roomLock');

// DBの初期化（ルーム管理用）
async function initRoomDatabase() {
    const pool = getPool();
    // 順番待ちキュー
    await pool.query(`
        CREATE TABLE IF NOT EXISTS room_queue (
            id INT AUTO_INCREMENT PRIMARY KEY,
            room_number INT NOT NULL,
            holder VARCHAR(255) NOT NULL DEFAULT 'なし'
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    
    // 設定
    await pool.query(`
        CREATE TABLE IF NOT EXISTS room_config (
            id INT PRIMARY KEY DEFAULT 1,
            max_member INT NOT NULL DEFAULT 10
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Insert default config if not exists
    const [configRows] = await pool.query('SELECT max_member FROM room_config WHERE id = 1');
    if (configRows.length === 0) {
        // マイグレーション試行
        let maxMember = 10;
        try {
            const fs = require('fs').promises;
            const path = require('path');
            const data = await fs.readFile(path.join(__dirname, '../../data/bot-config.json'), 'utf8');
            maxMember = JSON.parse(data).max_member || 10;
        } catch(e) {}
        await pool.query('INSERT INTO room_config (id, max_member) VALUES (1, ?)', [maxMember]);
    }

    const [queueRows] = await pool.query('SELECT COUNT(*) as count FROM room_queue');
    if (queueRows[0].count === 0) {
        try {
            const fs = require('fs').promises;
            const path = require('path');
            const data = await fs.readFile(path.join(__dirname, '../../data/room.json'), 'utf8');
            const roomsData = JSON.parse(data).rooms || [];
            if (roomsData.length > 0) {
                const values = roomsData.map(r => [r.room_number, r.holder || 'なし']);
                await pool.query('INSERT INTO room_queue (room_number, holder) VALUES ?', [values]);
            }
        } catch(e) {}
    }
}

// rooms配列をDBから取得する（id順 = キューの順序）
async function getRoomsData() {
    try {
        const [rows] = await getPool().query('SELECT room_number, holder FROM room_queue ORDER BY id ASC');
        return rows;
    } catch (e) {
        console.error('Failed to get rooms data:', e);
        return [];
    }
}

// rooms配列をDBに保存する（中身を完全に置き換える）
async function setRoomsData(roomsArray) {
    const pool = getPool();
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // AUTO_INCREMENTをリセットしつつ中身を空にするため、TRUNCATEの代わりにDELETEを使用し、IDをリセットする
        await connection.query('DELETE FROM room_queue');
        await connection.query('ALTER TABLE room_queue AUTO_INCREMENT = 1');
        
        if (roomsArray && roomsArray.length > 0) {
            const values = roomsArray.map(r => [r.room_number, r.holder || 'なし']);
            await connection.query('INSERT INTO room_queue (room_number, holder) VALUES ?', [values]);
        }
        await connection.commit();
    } catch (e) {
        await connection.rollback();
        console.error('Failed to set rooms data:', e);
        throw e;
    } finally {
        connection.release();
    }
}

async function getMaxMember() {
    try {
        const [rows] = await getPool().query('SELECT max_member FROM room_config WHERE id = 1');
        return rows.length > 0 ? rows[0].max_member : 10;
    } catch (e) {
        console.error('Failed to get max_member:', e);
        return 10;
    }
}

async function setMaxMember(value) {
    try {
        await getPool().query('UPDATE room_config SET max_member = ? WHERE id = 1', [value]);
    } catch (e) {
        console.error('Failed to set max_member:', e);
        throw e;
    }
}

module.exports = {
    initRoomDatabase,
    getRoomsData,
    setRoomsData,
    getMaxMember,
    setMaxMember,
    lock: roomMutex.lock,
    unlock: roomMutex.unlock
};
