const { getPool } = require('./db');

const usersCache = new Map();
const serverSettingsCache = new Map();
const dictionaryCache = new Map();
const autojoinCache = new Map();

const DEFAULT_USER_SETTING = {
  speaker_id: 3,
  pitch: 0.0,
  speed: 1.0,
};

const DEFAULT_SERVER_SETTING = {
  max_length: 50,
  join_notice_enabled: true,
};

async function loadAllData() {
  const pool = getPool();

  const [userRows] = await pool.query('SELECT user_id, speaker_id, pitch, speed FROM users');
  usersCache.clear();
  for (const row of userRows) {
    usersCache.set(row.user_id, {
      speaker_id: Number(row.speaker_id),
      pitch: Number(row.pitch),
      speed: Number(row.speed),
    });
  }

  const [serverRows] = await pool.query('SELECT server_id, max_length, join_notice_enabled FROM server_settings');
  serverSettingsCache.clear();
  for (const row of serverRows) {
    serverSettingsCache.set(row.server_id, {
      max_length: Number(row.max_length),
      join_notice_enabled: Boolean(row.join_notice_enabled),
    });
  }

  const [dictRows] = await pool.query('SELECT server_id, word, reading FROM dictionary');
  dictionaryCache.clear();
  for (const row of dictRows) {
    if (!dictionaryCache.has(row.server_id)) {
      dictionaryCache.set(row.server_id, new Map());
    }
    dictionaryCache.get(row.server_id).set(row.word, row.reading);
  }

  const [autojoinRows] = await pool.query('SELECT server_id, voice_channel_id FROM autojoin_settings');
  autojoinCache.clear();
  for (const row of autojoinRows) {
    autojoinCache.set(row.server_id, row.voice_channel_id);
  }

  console.log('In-memory cache loaded successfully from database.');
}

function getUserSetting(userId) {
  const cached = usersCache.get(userId);
  if (!cached) {
    return { ...DEFAULT_USER_SETTING };
  }
  return { ...cached };
}

async function setUserSetting(userId, data) {
  const current = getUserSetting(userId);
  const updated = {
    speaker_id: data.speaker_id !== undefined ? Number(data.speaker_id) : current.speaker_id,
    pitch: data.pitch !== undefined ? Number(data.pitch) : current.pitch,
    speed: data.speed !== undefined ? Number(data.speed) : current.speed,
  };

  usersCache.set(userId, updated);

  getPool().query(
    'INSERT INTO users (user_id, speaker_id, pitch, speed) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE speaker_id = VALUES(speaker_id), pitch = VALUES(pitch), speed = VALUES(speed)',
    [userId, updated.speaker_id, updated.pitch, updated.speed]
  ).catch(error => {
    console.error('Failed to asynchronously write user setting to database:', error);
  });
}

function getServerSetting(serverId) {
  const cached = serverSettingsCache.get(serverId);
  if (!cached) {
    return { ...DEFAULT_SERVER_SETTING };
  }
  return { ...cached };
}

async function setServerSetting(serverId, data) {
  const current = getServerSetting(serverId);
  const updated = {
    max_length: data.max_length !== undefined ? Number(data.max_length) : current.max_length,
    join_notice_enabled: data.join_notice_enabled !== undefined ? Boolean(data.join_notice_enabled) : current.join_notice_enabled,
  };

  serverSettingsCache.set(serverId, updated);

  getPool().query(
    'INSERT INTO server_settings (server_id, max_length, join_notice_enabled) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE max_length = VALUES(max_length), join_notice_enabled = VALUES(join_notice_enabled)',
    [serverId, updated.max_length, updated.join_notice_enabled ? 1 : 0]
  ).catch(error => {
    console.error('Failed to asynchronously write server setting to database:', error);
  });
}

function getDictionary(serverId) {
  const serverDictMap = dictionaryCache.get(serverId);
  if (!serverDictMap) {
    return [];
  }
  const list = [];
  for (const [word, reading] of serverDictMap.entries()) {
    list.push({ word, reading });
  }
  list.sort((a, b) => b.word.length - a.word.length);
  return list;
}

async function addDictionaryWord(serverId, word, reading) {
  if (!dictionaryCache.has(serverId)) {
    dictionaryCache.set(serverId, new Map());
  }
  dictionaryCache.get(serverId).set(word, reading);

  getPool().query(
    'INSERT INTO dictionary (server_id, word, reading) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE reading = VALUES(reading)',
    [serverId, word, reading]
  ).catch(error => {
    console.error('Failed to asynchronously write dictionary word to database:', error);
  });
}

async function removeDictionaryWord(serverId, word) {
  const serverDictMap = dictionaryCache.get(serverId);
  let removed = false;
  if (serverDictMap && serverDictMap.has(word)) {
    serverDictMap.delete(word);
    removed = true;
  }

  getPool().query(
    'DELETE FROM dictionary WHERE server_id = ? AND word = ?',
    [serverId, word]
  ).catch(error => {
    console.error('Failed to asynchronously delete dictionary word from database:', error);
  });

  return removed;
}

function getAutoJoinSetting(serverId) {
  return autojoinCache.get(serverId) || null;
}

async function setAutoJoinSetting(serverId, voiceChannelId) {
  autojoinCache.set(serverId, voiceChannelId);

  getPool().query(
    'INSERT INTO autojoin_settings (server_id, voice_channel_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE voice_channel_id = VALUES(voice_channel_id)',
    [serverId, voiceChannelId]
  ).catch(error => {
    console.error('Failed to asynchronously write autojoin setting to database:', error);
  });
}

async function removeAutoJoinSetting(serverId) {
  autojoinCache.delete(serverId);

  getPool().query(
    'DELETE FROM autojoin_settings WHERE server_id = ?',
    [serverId]
  ).catch(error => {
    console.error('Failed to asynchronously delete autojoin setting from database:', error);
  });
}

module.exports = {
  loadAllData,
  getUserSetting,
  setUserSetting,
  getServerSetting,
  setServerSetting,
  getDictionary,
  addDictionaryWord,
  removeDictionaryWord,
  getAutoJoinSetting,
  setAutoJoinSetting,
  removeAutoJoinSetting,
};
