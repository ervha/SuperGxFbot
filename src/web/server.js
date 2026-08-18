const express = require('express');
const path = require('path');
const crypto = require('crypto');
const roomManager = require('../core/roomManager');
require('dotenv').config();

function startWebServer(port = process.env.WEB_PORT || 3000) {
    const app = express();

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, 'public')));

    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public/index.html'));
    });
    app.get('/index.php', (req, res) => {
        res.sendFile(path.join(__dirname, 'public/index.html'));
    });
    app.get('/log', (req, res) => {
        res.sendFile(path.join(__dirname, 'public/log.html'));
    });
    app.get('/log.php', (req, res) => {
        res.sendFile(path.join(__dirname, 'public/log.html'));
    });
    app.get('/admin', (req, res) => {
        res.sendFile(path.join(__dirname, 'public/admin.html'));
    });
    app.get('/admin.php', (req, res) => {
        res.sendFile(path.join(__dirname, 'public/admin.html'));
    });

    async function handleGetRooms(req, res) {
        const lastKnownVersion = req.query.v || '';
        const startTime = Date.now();

        async function fetchRoomsPayload() {
            const rawRooms = await roomManager.getRoomsData();
            const statusText = await roomManager.getStatusText();

            const rooms = rawRooms.map(r => ({ room_number: String(r.room_number) }));
            rooms.push({ room_number: "0", display_text: statusText });

            const version = crypto.createHash('md5').update(JSON.stringify(rooms)).digest('hex');
            return { rooms, version };
        }

        const initial = await fetchRoomsPayload();
        if (!lastKnownVersion || initial.version !== lastKnownVersion) {
            return res.json({ status: 'success', version: initial.version, rooms: initial.rooms });
        }

        let isResolved = false;
        let timer = null;

        const onUpdate = async () => {
            if (isResolved) return;
            isResolved = true;
            if (timer) clearTimeout(timer);
            roomManager.roomEvents.removeListener('room_updated', onUpdate);
            const current = await fetchRoomsPayload();
            res.json({ status: 'success', version: current.version, rooms: current.rooms });
        };

        roomManager.roomEvents.once('room_updated', onUpdate);

        timer = setTimeout(() => {
            if (isResolved) return;
            isResolved = true;
            roomManager.roomEvents.removeListener('room_updated', onUpdate);
            res.json({ status: 'no_change', version: lastKnownVersion });
        }, 25000);

        req.on('close', () => {
            isResolved = true;
            if (timer) clearTimeout(timer);
            roomManager.roomEvents.removeListener('room_updated', onUpdate);
        });
    }

    app.get('/get_rooms.php', handleGetRooms);
    app.get('/api/rooms', handleGetRooms);

    async function handleGetLogs(req, res) {
        const lastKnownId = parseInt(req.query.last_id, 10) || 0;

        async function fetchLogsPayload() {
            const maxId = await roomManager.getMaxLogId();
            const logs = await roomManager.getRoomLogs(50);
            return { maxId, logs };
        }

        const initial = await fetchLogsPayload();
        if (lastKnownId === 0 || initial.maxId > lastKnownId) {
            return res.json({ status: 'success', max_id: initial.maxId, logs: initial.logs });
        }

        let isResolved = false;
        let timer = null;

        const onUpdate = async () => {
            if (isResolved) return;
            isResolved = true;
            if (timer) clearTimeout(timer);
            roomManager.roomEvents.removeListener('log_updated', onUpdate);
            const current = await fetchLogsPayload();
            res.json({ status: 'success', max_id: current.maxId, logs: current.logs });
        };

        roomManager.roomEvents.once('log_updated', onUpdate);

        timer = setTimeout(() => {
            if (isResolved) return;
            isResolved = true;
            roomManager.roomEvents.removeListener('log_updated', onUpdate);
            res.json({ status: 'no_change', max_id: initial.maxId, logs: [] });
        }, 25000);

        req.on('close', () => {
            isResolved = true;
            if (timer) clearTimeout(timer);
            roomManager.roomEvents.removeListener('log_updated', onUpdate);
        });
    }

    app.get('/get_logs.php', handleGetLogs);
    app.get('/api/logs', handleGetLogs);

    app.get('/api/admin/status', async (req, res) => {
        const counts = await roomManager.getCounts();
        res.json({ status: 'success', ...counts });
    });

    app.post('/api/admin/action', async (req, res) => {
        const { action } = req.body;
        try {
            if (action === 'clear_logs') {
                await roomManager.clearRoomLogs();
                return res.json({ status: 'success', message: '変更履歴ログを初期化しました。' });
            } else if (action === 'clear_rooms') {
                await roomManager.clearRoomsData();
                return res.json({ status: 'success', message: 'すべての部屋情報をクリアしました。' });
            }
            res.status(400).json({ status: 'error', error: '不正なアクションです。' });
        } catch (e) {
            res.status(500).json({ status: 'error', error: e.message });
        }
    });

    app.post('/api.php', async (req, res) => {
        const apiKey = req.body.api_key;
        const validKey = process.env.api_token || 'ervha2decline3r';
        if (apiKey !== validKey) {
            return res.status(403).json({ error: '認証エラー' });
        }

        const action = req.body.action;
        const room = req.body.room_number ? String(req.body.room_number).trim() : '';
        const oldRoom = req.body.old_room_number ? String(req.body.old_room_number).trim() : '';
        const position = req.body.position ? String(req.body.position).trim() : '';
        const displayText = req.body.display_text ? String(req.body.display_text).trim() : '';

        try {
            if (action === 'add') {
                if (!room) return res.status(400).json({ error: '部屋番号が不足しています' });
                const rooms = await roomManager.getRoomsData();
                if (!rooms.some(r => String(r.room_number) === room)) {
                    rooms.push({ room_number: parseInt(room, 10), holder: 'なし' });
                    await roomManager.setRoomsData(rooms);
                }
                await roomManager.addRoomLog(room, 'register', `部屋 No.${room} が新しく登録されました。`);
                return res.json({ status: 'success', message: 'added' });
            } else if (action === 'edit') {
                if (!room || !oldRoom) return res.status(400).json({ error: '新旧の部屋番号が不足しています' });
                const rooms = await roomManager.getRoomsData();
                const target = rooms.find(r => String(r.room_number) === oldRoom);
                if (target) {
                    target.room_number = parseInt(room, 10);
                    await roomManager.setRoomsData(rooms);
                }
                await roomManager.addRoomLog(room, 'register', `${position}番目の部屋の部屋番号が No.${oldRoom} から No.${room} に修正されました。`);
                return res.json({ status: 'success', message: 'edited' });
            } else if (action === 'delete') {
                if (!room) return res.status(400).json({ error: '部屋番号が不足しています' });
                const rooms = await roomManager.getRoomsData();
                const filtered = rooms.filter(r => String(r.room_number) !== room);
                await roomManager.setRoomsData(filtered);
                await roomManager.addRoomLog(room, 'delete', `部屋 No.${room} の処理が完了しました。`);
                return res.json({ status: 'success', message: 'deleted' });
            } else if (action === 'update_all') {
                await roomManager.clearRoomsData();
                return res.json({ status: 'success', message: 'cleared' });
            } else if (action === 'update_status') {
                await roomManager.setStatusText(displayText);
                return res.json({ status: 'success', message: 'status updated' });
            }
            res.status(400).json({ error: '不明なアクションです' });
        } catch (e) {
            res.status(500).json({ error: 'サーバーエラー: ' + e.message });
        }
    });

    const server = app.listen(port, () => {
        console.log(`[Web Server] Room management web server listening on port ${port}`);
    });

    return server;
}

module.exports = { startWebServer };
