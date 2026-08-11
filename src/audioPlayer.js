const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType,
} = require('@discordjs/voice');
const { Readable } = require('stream');
const voicevox = require('./voicevox');
const dataManager = require('./dataManager');

const guildManagers = new Map();

function resampleWavToRaw(wavBuffer) {
  const dataOffset = 44;
  if (wavBuffer.length <= dataOffset) return Buffer.alloc(0);

  const numSamples = (wavBuffer.length - dataOffset) / 2;
  // Node.jsのBufferの基盤となるArrayBufferを直接Int16Arrayとしてビュー（参照）する
  const inArray = new Int16Array(wavBuffer.buffer, wavBuffer.byteOffset + dataOffset, numSamples);
  
  // メモリのゼロ埋めをスキップ（高速化）
  const outBuffer = Buffer.allocUnsafe(numSamples * 8);
  const outArray = new Int16Array(outBuffer.buffer, outBuffer.byteOffset, numSamples * 4);
  
  let prevSample = inArray[0];
  let outIdx = 0;
  
  for (let i = 0; i < numSamples; i++) {
    const currentSample = inArray[i];
    // Math.roundや除算を避け、ビットシフト演算(>>1)で超高速に中間値を計算
    const midSample = (prevSample + currentSample) >> 1;
    
    outArray[outIdx++] = midSample;       // Left (interpolated)
    outArray[outIdx++] = midSample;       // Right (interpolated)
    outArray[outIdx++] = currentSample;   // Left (actual)
    outArray[outIdx++] = currentSample;   // Right (actual)
    
    prevSample = currentSample;
  }
  
  return outBuffer;
}

function getGuildManager(guildId) {
  return guildManagers.get(guildId) || null;
}

function joinChannel(voiceChannel, textChannelId = null) {
  const guildId = voiceChannel.guild.id;
  let manager = guildManagers.get(guildId);

  if (manager && manager.connection) {
    if (manager.connection.state.status !== VoiceConnectionStatus.Destroyed) {
      if (textChannelId) {
        manager.readChannelId = textChannelId;
      }
      return manager;
    }
  }

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: guildId,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    selfDeaf: true,
  });

  const player = createAudioPlayer();
  connection.subscribe(player);

  manager = {
    connection,
    player,
    voiceChannelId: voiceChannel.id,
    readChannelId: textChannelId,
    queue: [],
    isPlaying: false,
  };

  guildManagers.set(guildId, manager);

  player.on(AudioPlayerStatus.Idle, () => {
    manager.isPlaying = false;
    playNext(guildId);
  });

  player.on('error', (error) => {
    console.error(`Audio player error in guild ${guildId}:`, error.message);
    manager.isPlaying = false;
    playNext(guildId);
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5000),
      ]);
    } catch (e) {
      leaveChannel(guildId);
    }
  });

  return manager;
}

function leaveChannel(guildId) {
  const manager = guildManagers.get(guildId);
  if (!manager) return;

  try {
    if (manager.player) {
      manager.player.stop();
    }
    if (manager.connection && manager.connection.state.status !== VoiceConnectionStatus.Destroyed) {
      manager.connection.destroy();
    }
  } catch (error) {
    console.error(`Failed to destroy voice connection for guild ${guildId}:`, error.message);
  } finally {
    guildManagers.delete(guildId);
  }
}

function ensurePreGeneration(guildId) {
  const manager = guildManagers.get(guildId);
  if (!manager || manager.queue.length === 0) return;

  // キューの中からまだ生成開始していない最初のアイテムを探す
  const ungeneratedItem = manager.queue.find(item => !item.audioPromise);
  if (!ungeneratedItem) return; // 全て生成中または生成済み

  // 現在生成中のアイテムがあるか確認（Voicevoxへの同時リクエストを防ぐため1つずつ処理）
  const isGenerating = manager.queue.some(item => item.isGenerating);
  if (isGenerating) return;

  ungeneratedItem.isGenerating = true;
  const serverSetting = dataManager.getServerSetting(guildId);

  ungeneratedItem.audioPromise = voicevox.generateAudio(
    ungeneratedItem.text,
    ungeneratedItem.userSetting.speaker_id,
    ungeneratedItem.userSetting.pitch,
    ungeneratedItem.userSetting.speed,
    ungeneratedItem.userSetting.intonation,
    serverSetting.volume
  ).catch(error => {
    console.error(`Pre-generation failed for guild ${guildId}:`, error.message);
    return null;
  }).finally(() => {
    ungeneratedItem.isGenerating = false;
    // 次のチャンクがあれば続けて生成を開始する
    ensurePreGeneration(guildId);
  });
}

function enqueueText(guildId, text, userSetting) {
  const manager = guildManagers.get(guildId);
  if (!manager) return false;

  manager.queue.push({ text, userSetting, audioPromise: null, isGenerating: false });
  
  // 事前生成ループをキック
  ensurePreGeneration(guildId);

  if (!manager.isPlaying) {
    playNext(guildId);
  }
  return true;
}

async function playNext(guildId) {
  const manager = guildManagers.get(guildId);
  if (!manager || manager.isPlaying || manager.queue.length === 0) {
    return;
  }

  manager.isPlaying = true;
  const item = manager.queue.shift();

  try {
    // 生成が終わるまで待機
    if (!item.audioPromise) {
       // 万が一Promiseがまだない場合は即座に生成開始（通常はensurePreGenerationで開始済み）
       ensurePreGeneration(guildId);
    }
    const wavBuffer = await item.audioPromise;

    if (!wavBuffer) {
      manager.isPlaying = false;
      playNext(guildId);
      return;
    }

    const rawBuffer = resampleWavToRaw(wavBuffer);
    const stream = Readable.from(rawBuffer);
    const resource = createAudioResource(stream, {
      inputType: StreamType.Raw,
    });

    manager.player.play(resource);
  } catch (error) {
    console.error(`Failed to process audio queue for guild ${guildId}:`, error.message);
    manager.isPlaying = false;
    playNext(guildId);
  }
}

function stopAudio(guildId) {
  const manager = guildManagers.get(guildId);
  if (!manager) return;

  manager.queue = [];
  manager.isPlaying = false;
  if (manager.player) {
    manager.player.stop();
  }
}

function getConnectedChannelId(guildId) {
  const manager = guildManagers.get(guildId);
  if (!manager || !manager.connection) return null;
  if (manager.connection.state.status === VoiceConnectionStatus.Destroyed) return null;
  return manager.voiceChannelId;
}

function getReadChannelId(guildId) {
  const manager = guildManagers.get(guildId);
  return manager ? manager.readChannelId : null;
}

function setReadChannelId(guildId, channelId) {
  const manager = guildManagers.get(guildId);
  if (manager) {
    manager.readChannelId = channelId;
  }
}

module.exports = {
  joinChannel,
  leaveChannel,
  enqueueText,
  stopAudio,
  getConnectedChannelId,
  getReadChannelId,
  setReadChannelId,
  getGuildManager,
};
