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
const { getPool } = require('./db');

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

function createChimePCM() {
  const fs = require('fs');
  const path = require('path');
  const chimePath = path.join(__dirname, '../../audio_cache/system/chime.pcm');

  // すでにファイルがあればそれを読み込んで返す
  if (fs.existsSync(chimePath)) {
    return fs.readFileSync(chimePath);
  }

  const sampleRate = 48000;
  const duration = 0.5;
  const numSamples = sampleRate * duration;
  const buffer = Buffer.allocUnsafe(numSamples * 4); // 16bit Stereo
  
  for (let i = 0; i < numSamples; i++) {
    const time = i / sampleRate;
    const freq1 = 392.0; 
    const freq2 = 493.88;
    
    const envelope = Math.max(0, Math.exp(-time * 6)); 
    
    const val1 = Math.sin(2 * Math.PI * freq1 * time);
    const val2 = Math.sin(2 * Math.PI * freq2 * time);
    let val = (val1 + val2) * 0.5 * envelope * 0.15;
    
    const intVal = Math.max(-32768, Math.min(32767, val * 32768));
    
    buffer.writeInt16LE(intVal, i * 4);     // Left
    buffer.writeInt16LE(intVal, i * 4 + 2); // Right
  }

  // 生成した音声をキャッシュに保存
  fs.mkdirSync(path.dirname(chimePath), { recursive: true });
  fs.writeFileSync(chimePath, buffer);

  return buffer;
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
    priorityQueue: [], // 割り込み・最優先再生用キュー
    isPlaying: false,
  };

  guildManagers.set(guildId, manager);

  // DBにアクティブな接続を保存
  if (textChannelId) {
    getPool().query(
      'INSERT INTO active_connections (guild_id, voice_channel_id, text_channel_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE voice_channel_id = VALUES(voice_channel_id), text_channel_id = VALUES(text_channel_id)',
      [guildId, voiceChannel.id, textChannelId]
    ).catch(error => {
      console.error(`Failed to save active connection for guild ${guildId}:`, error);
    });
  }

  player.on(AudioPlayerStatus.Idle, () => {
    manager.isPlaying = false;
    playNext(guildId);
  });

  player.on('error', (error) => {
    console.error(`Audio player error in guild ${guildId}:`, error.message);
    manager.isPlaying = false;
    playNext(guildId);
  });

  connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
    // newState.closeCode が 4014 の場合は「ユーザーから手動で切断された」か「チャンネルを移動された」
    if (newState.reason === 0 || newState.closeCode === 4014) {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5000),
        ]);
        // チャンネル移動などによる一時的な切断であれば復帰する
      } catch (error) {
        // 5秒経っても復帰しなければ、手動キックとみなして退出処理
        leaveChannel(guildId);
      }
    } else if (connection.rejoinAttempts < 5) {
      // ネットワークエラーやDiscord側のサーバークラッシュの場合、自動で再接続(rejoin)を試みる
      await new Promise(resolve => setTimeout(resolve, (connection.rejoinAttempts + 1) * 1000));
      if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
        console.log(`[Auto-Reconnect] 意図しない切断を検知しました。再接続を試みます (Attempt: ${connection.rejoinAttempts + 1}/5)`);
        connection.rejoin();
      }
    } else {
      // リトライ上限に達した場合は諦める
      console.error(`[Auto-Reconnect] 再接続の上限に達したため退出します (Guild: ${guildId})`);
      leaveChannel(guildId);
    }
  });

  // 強制切断（キックやチャンネル削除など）によるゾンビ化を完全に防ぐ
  connection.on(VoiceConnectionStatus.Destroyed, () => {
    stopAudio(guildId);
    guildManagers.delete(guildId);
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
    getPool().query('DELETE FROM active_connections WHERE guild_id = ?', [guildId])
      .catch(error => console.error(`Failed to delete active connection for guild ${guildId}:`, error));
  }
}

async function restoreConnections(client) {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT guild_id, voice_channel_id, text_channel_id FROM active_connections');
    if (rows.length === 0) return;
    
    console.log(`[Auto-Restore] 以前の接続情報を復元します (${rows.length}件)`);
    
    for (const row of rows) {
      try {
        const guild = await client.guilds.fetch(row.guild_id).catch(() => null);
        if (!guild) {
          await pool.query('DELETE FROM active_connections WHERE guild_id = ?', [row.guild_id]);
          continue;
        }
        
        const voiceChannel = await guild.channels.fetch(row.voice_channel_id).catch(() => null);
        if (!voiceChannel || !voiceChannel.isVoiceBased()) {
          await pool.query('DELETE FROM active_connections WHERE guild_id = ?', [row.guild_id]);
          continue;
        }

        // しれっと戻るために静かに再接続
        joinChannel(voiceChannel, row.text_channel_id);
        console.log(`[Auto-Restore] サーバー: ${guild.name} のVCに再接続しました`);
        
        if (row.text_channel_id) {
          const textChannel = await guild.channels.fetch(row.text_channel_id).catch(() => null);
          if (textChannel && textChannel.isTextBased()) {
            await textChannel.send('🔄 **[システム通知]**\nボットが再起動・または再接続処理を行ったため、自動復帰しました。引き続き読み上げを行います！').catch(() => {});
          }
        }
      } catch (e) {
        console.error(`[Auto-Restore] guild ${row.guild_id} の復元に失敗しました:`, e);
      }
    }
  } catch (error) {
    console.error(`[Auto-Restore] DBからの復元処理に失敗しました:`, error);
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
    serverSetting.volume,
    ungeneratedItem.isSystem
  ).catch(error => {
    console.error(`Pre-generation failed for guild ${guildId}:`, error.message);
    return null;
  }).finally(() => {
    ungeneratedItem.isGenerating = false;
    // 次のチャンクがあれば続けて生成を開始する
    ensurePreGeneration(guildId);
  });
}

function enqueueText(guildId, text, userSetting, isSystem = false) {
  const manager = guildManagers.get(guildId);
  if (!manager) return false;

  manager.queue.push({ text, userSetting, audioPromise: null, isGenerating: false, isSystem });
  
  // 事前生成ループをキック
  ensurePreGeneration(guildId);

  if (!manager.isPlaying) {
    playNext(guildId);
  }
  return true;
}

async function playNext(guildId) {
  const manager = guildManagers.get(guildId);
  if (!manager || manager.isPlaying) {
    return;
  }

  let item = null;
  let isPriority = false;

  // 優先キュー（通知音など）があればそちらを先に処理する
  if (manager.priorityQueue && manager.priorityQueue.length > 0) {
    item = manager.priorityQueue.shift();
    isPriority = true;
  } else if (manager.queue && manager.queue.length > 0) {
    item = manager.queue.shift();
  } else {
    return; // 再生するものが何もない
  }

  manager.isPlaying = true;

  try {
    if (isPriority) {
      // 優先アイテム（効果音）の場合はそのままPCMバッファとして再生
      const stream = Readable.from(item.rawBuffer);
      const resource = createAudioResource(stream, { inputType: StreamType.Raw });
      manager.player.play(resource);
      return;
    }

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
  manager.priorityQueue = [];
  manager.isPlaying = false;
  if (manager.player) {
    manager.player.stop();
  }
}

// 優先キューにチャイムを追加して再生をトリガーする関数
function playChime(guildId) {
  const manager = guildManagers.get(guildId);
  if (!manager) return false;
  
  const chimeBuffer = createChimePCM();
  manager.priorityQueue.push({ rawBuffer: chimeBuffer });
  
  if (!manager.isPlaying) {
    playNext(guildId);
  }
  return true;
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
    getPool().query(
      'UPDATE active_connections SET text_channel_id = ? WHERE guild_id = ?',
      [channelId, guildId]
    ).catch(err => console.error(err));
  }
}

module.exports = {
  joinChannel,
  leaveChannel,
  enqueueText,
  stopAudio,
  playChime,
  getConnectedChannelId,
  getReadChannelId,
  setReadChannelId,
  getGuildManager,
  restoreConnections,
};
