const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const audioPlayer = require('../../src/audioPlayer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('ボイスチャンネルから切断します'),

  async execute(interaction) {
    const connectedChannelId = audioPlayer.getConnectedChannelId(interaction.guildId);
    if (!connectedChannelId) {
      await interaction.reply({
        content: 'ボットはボイスチャンネルに接続していません。',
        ephemeral: true,
      });
      return;
    }

    try {
      audioPlayer.leaveChannel(interaction.guildId);

      const embed = new EmbedBuilder()
        .setTitle('ボイスチャンネル切断')
        .setDescription('ボイスチャンネルから切断しました。')
        .setColor(0xE74C3C);

      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
    } catch (error) {
      console.error('Failed to leave voice channel:', error);
      await interaction.reply({
        content: '切断処理中にエラーが発生しました。',
        ephemeral: true,
      });
    }
  },
};
