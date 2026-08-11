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

  const pcmLength = wavBuffer.length - dataOffset;
  const outBuffer = Buffer.alloc(pcmLength * 4);
  
  let outOffset = 0;
  let prevSample = wavBuffer.readInt16LE(dataOffset);

  for (let i = dataOffset; i < wavBuffer.length; i += 2) {
    const currentSample = wavBuffer.readInt16LE(i);
    const midSample = Math.round((prevSample + currentSample) / 2);
    
    outBuffer.writeInt16LE(midSample, outOffset);       // Left
    outBuffer.writeInt16LE(midSample, outOffset + 2);   // Right
    outBuffer.writeInt16LE(currentSample, outOffset + 4); // Left
    outBuffer.writeInt16LE(currentSample, outOffset + 6); // Right
    
    outOffset += 8;
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

function enqueueText(guildId, text, userSetting) {
  const manager = guildManagers.get(guildId);
  if (!manager) return false;

  const serverSetting = dataManager.getServerSetting(guildId);

  const audioPromise = voicevox.generateAudio(
    text,
    userSetting.speaker_id,
    userSetting.pitch,
    userSetting.speed,
    userSetting.intonation,
    serverSetting.volume
  ).catch(error => {
    console.error(`Pre-generation failed for guild ${guildId}:`, error.message);
    return null;
  });

  manager.queue.push({ audioPromise });

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
