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
            // 誰もいなくなった場合は退出
            audioPlayer.leaveChannel(guildId);
          } else {
            // 他の人が残っている場合は退室メッセージを読み上げ
            const serverSetting = dataManager.getServerSetting(guildId);
            if (serverSetting.join_notice_enabled) {
              const displayName = oldState.member.displayName;
              const noticeText = `${displayName}さんが退室しました`;
              const userSetting = dataManager.getUserSetting(oldState.member.id);
              audioPlayer.enqueueText(guildId, noticeText, userSetting);
            }
          }
        }
      }
    }

    if (!isJoin) return;

    const autoJoinChannelId = dataManager.getAutoJoinSetting(guildId);
    const connectedChannelId = audioPlayer.getConnectedChannelId(guildId);

    // 今回入室したチャンネルにいる「ボット以外の人間」の数をカウント
    const nonBotMembers = newState.channel.members.filter(m => !m.user.bot);

    // 自動接続先であり、未接続で、かつ「入室した人が1人目の人間である（誰もいなかった）」場合のみ接続する
    if (autoJoinChannelId && autoJoinChannelId === newState.channelId && !connectedChannelId && nonBotMembers.size === 1) {
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
