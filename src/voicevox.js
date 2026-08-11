const axios = require('axios');
const http = require('http');
const https = require('https');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const config = require('../config');

const VOICEVOX_URL = config.voicevoxUrl;

const apiClient = axios.create({
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
});

const CACHE_DIR = path.join(__dirname, '../audio_cache');
const SYSTEM_CACHE_DIR = path.join(__dirname, '../audio_cache/system');
const MAX_CACHE_SIZE = 1000;

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}
if (!fs.existsSync(SYSTEM_CACHE_DIR)) {
  fs.mkdirSync(SYSTEM_CACHE_DIR, { recursive: true });
}

function generateHash(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

async function cleanUpOldCache() {
  try {
    const files = await fsp.readdir(CACHE_DIR);
    const wavFiles = files.filter(f => f.endsWith('.wav'));
    if (wavFiles.length <= MAX_CACHE_SIZE) return;

    const statPromises = wavFiles.map(async (file) => {
      const filePath = path.join(CACHE_DIR, file);
      const stats = await fsp.stat(filePath);
      return { file: filePath, mtime: stats.mtime.getTime() };
    });

    const fileStats = await Promise.all(statPromises);
    fileStats.sort((a, b) => a.mtime - b.mtime);

    const excess = fileStats.length - MAX_CACHE_SIZE;
    for (let i = 0; i < excess; i++) {
      await fsp.unlink(fileStats[i].file).catch(() => { });
    }
  } catch (error) {
    console.error('Failed to clean up audio cache:', error.message);
  }
}

async function fileExists(filePath) {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}

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
  const hash = generateHash(cacheKey);
  const targetDir = isSystem ? SYSTEM_CACHE_DIR : CACHE_DIR;
  const filePath = path.join(targetDir, `${hash}.wav`);

  const exists = await fileExists(filePath);

  if (exists) {
    try {
      const now = new Date();
      await fsp.utimes(filePath, now, now);
      return await fsp.readFile(filePath);
    } catch (error) {
      console.error('Failed to read cache file:', error.message);
    }
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

    await fsp.writeFile(filePath, audioBuffer);

    if (!isSystem) {
      cleanUpOldCache();
    }

    return audioBuffer;
  } catch (error) {
    console.error('Failed to generate audio from VOICEVOX Engine:', error.message);
    return null;
  }
}

async function preloadSystemMessages(texts, speakerId = 3, pitch = 0.0, speed = 1.0, intonation = 1.0, volume = 1.0) {
  for (const text of texts) {
    await generateAudio(text, speakerId, pitch, speed, intonation, volume, true);
  }
}

module.exports = {
  getSpeakers,
  generateAudio,
  preloadSystemMessages,
};