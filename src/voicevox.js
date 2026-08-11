const axios = require('axios');
const http = require('http');
const https = require('https');
const config = require('../config');

const VOICEVOX_URL = config.voicevoxUrl;

const apiClient = axios.create({
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
});

const systemAudioCache = new Map();
const audioCache = new Map();
const MAX_CACHE_SIZE = 100;

async function getSpeakers() {
  try {
    const response = await apiClient.get(`${VOICEVOX_URL}/speakers`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch speakers from VOICEVOX Engine:', error.message);
    return [];
  }
}

async function generateAudio(text, speakerId = 3, pitch = 0.0, speed = 1.0, intonation = 1.0, volume = 1.0, isSystem = false) {
  const cacheKey = `${text}_${speakerId}_${pitch}_${speed}_${intonation}_${volume}`;

  // 1. システムメッセージの場合は永続キャッシュを確認
  if (isSystem && systemAudioCache.has(cacheKey)) {
    return systemAudioCache.get(cacheKey);
  }

  // 2. 通常のメッセージの場合はLRUキャッシュを確認
  if (!isSystem && audioCache.has(cacheKey)) {
    const audioBuffer = audioCache.get(cacheKey);
    // アクセスがあったものを削除して再セットすることで、削除対象から遠ざける (LRUの実現)
    audioCache.delete(cacheKey);
    audioCache.set(cacheKey, audioBuffer);
    return audioBuffer;
  }

  try {
    const queryResponse = await apiClient.post(
      `${VOICEVOX_URL}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`
    );

    const queryData = queryResponse.data;
    queryData.pitchScale = Number(pitch);
    queryData.speedScale = Number(speed);
    queryData.intonationScale = Number(intonation);
    queryData.volumeScale = Number(volume);

    const synthesisResponse = await apiClient.post(
      `${VOICEVOX_URL}/synthesis?speaker=${speakerId}`,
      queryData,
      {
        headers: { 'Content-Type': 'application/json' },
        responseType: 'arraybuffer',
      }
    );

    const audioBuffer = Buffer.from(synthesisResponse.data);

    if (isSystem) {
      systemAudioCache.set(cacheKey, audioBuffer);
    } else {
      if (audioCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = audioCache.keys().next().value;
        audioCache.delete(oldestKey);
      }
      audioCache.set(cacheKey, audioBuffer);
    }

    return audioBuffer;
  } catch (error) {
    console.error('Failed to generate audio from VOICEVOX Engine:', error.message);
    return null;
  }
}

async function preloadSystemMessages(texts, speakerId = 3, pitch = 0.0, speed = 1.0, intonation = 1.0, volume = 1.0) {
  for (const text of texts) {
    // isSystem = true として呼び出す
    await generateAudio(text, speakerId, pitch, speed, intonation, volume, true);
  }
}

module.exports = {
  getSpeakers,
  generateAudio,
};
