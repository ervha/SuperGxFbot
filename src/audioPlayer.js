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

const guildManagers = new Map();

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

  manager.queue.push({ text, userSetting });
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
    const audioBuffer = await voicevox.generateAudio(
      item.text,
      item.userSetting.speaker_id,
      item.userSetting.pitch,
      item.userSetting.speed
    );

    if (!audioBuffer) {
      manager.isPlaying = false;
      playNext(guildId);
      return;
    }

    const stream = Readable.from(audioBuffer);
    const resource = createAudioResource(stream, {
      inputType: StreamType.Arbitrary,
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
