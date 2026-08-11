const { Events } = require('discord.js');
const audioPlayer = require('../src/audioPlayer');
const dataManager = require('../src/dataManager');

module.exports = {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState) {
    if (!newState.member || newState.member.user.bot) return;

    const guild = newState.guild;
    const guildId = guild.id;

    const isJoin = oldState.channelId !== newState.channelId && newState.channelId !== null;
    if (!isJoin) return;

    const autoJoinChannelId = dataManager.getAutoJoinSetting(guildId);
    const connectedChannelId = audioPlayer.getConnectedChannelId(guildId);

    if (autoJoinChannelId && autoJoinChannelId === newState.channelId && !connectedChannelId) {
      try {
        const textChannel = guild.systemChannel || guild.channels.cache.find(ch => ch.isTextBased() && ch.permissionsFor(guild.members.me).has('SendMessages'));
        audioPlayer.joinChannel(newState.channel, textChannel ? textChannel.id : null);
      } catch (error) {
        console.error(`Failed auto-join for guild ${guildId}:`, error.message);
      }
    }

    const updatedConnectedChannelId = audioPlayer.getConnectedChannelId(guildId);
    const serverSetting = dataManager.getServerSetting(guildId);

    if (
      serverSetting.join_notice_enabled &&
      updatedConnectedChannelId &&
      updatedConnectedChannelId === newState.channelId
    ) {
      const displayName = newState.member.displayName;
      const noticeText = `${displayName}さんが入室しました`;
      const userSetting = dataManager.getUserSetting(newState.member.id);

      audioPlayer.enqueueText(guildId, noticeText, userSetting);
    }
  },
};
