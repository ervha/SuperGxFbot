const axios = require('axios');
const config = require('../config');

const VOICEVOX_URL = config.voicevoxUrl;

async function getSpeakers() {
  try {
    const response = await axios.get(`${VOICEVOX_URL}/speakers`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch speakers from VOICEVOX Engine:', error.message);
    return [];
  }
}

async function generateAudio(text, speakerId = 3, pitch = 0.0, speed = 1.0, intonation = 1.0, volume = 1.0) {
  try {
    const queryResponse = await axios.post(
      `${VOICEVOX_URL}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`
    );

    const queryData = queryResponse.data;
    queryData.pitchScale = Number(pitch);
    queryData.speedScale = Number(speed);
    queryData.intonationScale = Number(intonation);
    queryData.volumeScale = Number(volume);

    const synthesisResponse = await axios.post(
      `${VOICEVOX_URL}/synthesis?speaker=${speakerId}`,
      queryData,
      {
        headers: { 'Content-Type': 'application/json' },
        responseType: 'arraybuffer',
      }
    );

    return Buffer.from(synthesisResponse.data);
  } catch (error) {
    console.error('Failed to generate audio from VOICEVOX Engine:', error.message);
    return null;
  }
}

module.exports = {
  getSpeakers,
  generateAudio,
};
