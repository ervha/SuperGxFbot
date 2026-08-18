const { getPool } = require('./db');
const roomMutex = require('./roomLock');
const EventEmitter = require('events');

const roomEvents = new EventEmitter();
roomEvents.setMaxListeners(200);

async function initRoomDatabase() {
    const pool = getPool();
    
    await pool.query(`
        CREATE TABLE IF NOT EXISTS room_queue (
            id INT AUTO_INCREMENT PRIMARY KEY,
            room_number INT NOT NULL,
            holder VARCHAR(255) NOT NULL DEFAULT 'なし'
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    
    await pool.query(`
        CREATE TABLE IF NOT EXISTS room_config (
            id INT PRIMARY KEY DEFAULT 1,
            max_member INT NOT NULL DEFAULT 10
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS status_board (
            key_name VARCHAR(50) PRIMARY KEY,
            display_text TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS room_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            room_number VARCHAR(50) NOT NULL,
            action_type VARCHAR(50) NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const [configRows] = await pool.query('SELECT max_member FROM room_config WHERE id = 1');
    if (configRows.length === 0) {
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

async function getRoomsData() {
    try {
        const [rows] = await getPool().query('SELECT room_number, holder FROM room_queue ORDER BY id ASC');
        return rows;
    } catch (e) {
        console.error('Failed to get rooms data:', e);
        return [];
    }
}

async function setRoomsData(roomsArray) {
    const pool = getPool();
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        await connection.query('DELETE FROM room_queue');
        await connection.query('ALTER TABLE room_queue AUTO_INCREMENT = 1');
        
        if (roomsArray && roomsArray.length > 0) {
            const values = roomsArray.map(r => [r.room_number, r.holder || 'なし']);
            await connection.query('INSERT INTO room_queue (room_number, holder) VALUES ?', [values]);
        }
        await connection.commit();
        roomEvents.emit('room_updated');
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

async function getStatusText() {
    try {
        const [rows] = await getPool().query("SELECT display_text FROM status_board WHERE key_name = 'main_status'");
        return rows.length > 0 ? rows[0].display_text : '処理待ちの部屋はありません';
    } catch (e) {
        console.error('Failed to get status text:', e);
        return '処理待ちの部屋はありません';
    }
}

async function setStatusText(displayText) {
    try {
        await getPool().query(`
            INSERT INTO status_board (key_name, display_text) VALUES ('main_status', ?)
            ON DUPLICATE KEY UPDATE display_text = ?
        `, [displayText, displayText]);
        roomEvents.emit('room_updated');
    } catch (e) {
        console.error('Failed to set status text:', e);
        throw e;
    }
}

async function addRoomLog(roomNumber, actionType, message) {
    try {
        await getPool().query(
            'INSERT INTO room_logs (room_number, action_type, message) VALUES (?, ?, ?)',
            [roomNumber, actionType, message]
        );
        roomEvents.emit('log_updated');
    } catch (e) {
        console.error('Failed to add room log:', e);
    }
}

async function getMaxLogId() {
    try {
        const [rows] = await getPool().query('SELECT MAX(id) as max_id FROM room_logs');
        return rows[0] && rows[0].max_id ? Number(rows[0].max_id) : 0;
    } catch (e) {
        console.error('Failed to get max log id:', e);
        return 0;
    }
}

async function getRoomLogs(limit = 50) {
    try {
        const [rows] = await getPool().query(`
            SELECT * FROM (
                SELECT id, room_number, action_type, message, 
                       DATE_FORMAT(created_at, '%Y/%m/%d %H:%i:%s') as formatted_time 
                FROM room_logs 
                ORDER BY id DESC 
                LIMIT ?
            ) sub
            ORDER BY id ASC
        `, [limit]);
        return rows;
    } catch (e) {
        console.error('Failed to get room logs:', e);
        return [];
    }
}

async function getCounts() {
    try {
        const pool = getPool();
        const [roomRows] = await pool.query('SELECT COUNT(*) as count FROM room_queue');
        const [logRows] = await pool.query('SELECT COUNT(*) as count FROM room_logs');
        return {
            room_count: roomRows[0].count,
            log_count: logRows[0].count
        };
    } catch (e) {
        console.error('Failed to get counts:', e);
        return { room_count: 0, log_count: 0 };
    }
}

async function clearRoomLogs() {
    try {
        const pool = getPool();
        await pool.query('DELETE FROM room_logs');
        await pool.query('ALTER TABLE room_logs AUTO_INCREMENT = 1');
        await addRoomLog('0', 'delete', '管理画面より、変更履歴ログが初期化されました。');
        roomEvents.emit('log_updated');
    } catch (e) {
        console.error('Failed to clear room logs:', e);
        throw e;
    }
}

async function clearRoomsData() {
    try {
        const pool = getPool();
        await pool.query('DELETE FROM room_queue');
        await pool.query('ALTER TABLE room_queue AUTO_INCREMENT = 1');
        await setStatusText('処理待ちの部屋はありません');
        await addRoomLog('0', 'delete', '管理画面より、すべての部屋情報が一括クリアされました。');
        roomEvents.emit('room_updated');
        roomEvents.emit('log_updated');
    } catch (e) {
        console.error('Failed to clear rooms data:', e);
        throw e;
    }
}

module.exports = {
    initRoomDatabase,
    getRoomsData,
    setRoomsData,
    getMaxMember,
    setMaxMember,
    getStatusText,
    setStatusText,
    addRoomLog,
    getMaxLogId,
    getRoomLogs,
    getCounts,
    clearRoomLogs,
    clearRoomsData,
    roomEvents,
    lock: roomMutex.lock,
    unlock: roomMutex.unlock
};
