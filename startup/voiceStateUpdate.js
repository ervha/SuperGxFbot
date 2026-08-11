const { Events, EmbedBuilder } = require('discord.js');
const audioPlayer = require('../src/audioPlayer');
const dataManager = require('../src/dataManager');

module.exports = {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState) {
    if (!newState.member || newState.member.user.bot) return;

    const guild = newState.guild;
    const guildId = guild.id;

    const isJoin = oldState.channelId !== newState.channelId && newState.channelId !== null;
    const isLeave = oldState.channelId !== newState.channelId && oldState.channelId !== null;

    if (isLeave) {
      const connectedChannelId = audioPlayer.getConnectedChannelId(guildId);
      if (connectedChannelId && connectedChannelId === oldState.channelId) {
        const oldChannel = oldState.channel;
        if (oldChannel) {
          const nonBotMembers = oldChannel.members.filter(m => !m.user.bot);
          if (nonBotMembers.size === 0) {
            audioPlayer.leaveChannel(guildId);
          }
        }
      }
    }

    if (!isJoin) return;

    const autoJoinChannelId = dataManager.getAutoJoinSetting(guildId);
    const connectedChannelId = audioPlayer.getConnectedChannelId(guildId);

    if (autoJoinChannelId && autoJoinChannelId === newState.channelId && !connectedChannelId) {
      try {
        // VC内テキストチャンネルを読み上げ対象としてセット
        audioPlayer.joinChannel(newState.channel, newState.channelId);

        const embed = new EmbedBuilder()
          .setTitle('自動接続')
          .setDescription(`${newState.channel.name} に自動接続しました。このチャンネルのメッセージを読み上げます。`)
          .setColor(0x00AE86);

        await newState.channel.send({ embeds: [embed] });
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
