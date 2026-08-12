const { SlashCommandBuilder, EmbedBuilder , MessageFlags } = require('discord.js');
const audioPlayer = require('../../core/audioPlayer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('ボイスチャンネルから切断します'),

  async execute(interaction) {
    const connectedChannelId = audioPlayer.getConnectedChannelId(interaction.guildId);
    if (!connectedChannelId) {
      await interaction.reply({
        content: 'ボットはボイスチャンネルに接続していません。',
        flags: MessageFlags.Ephemeral,
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
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error('Failed to leave voice channel:', error);
      await interaction.reply({
        content: '切断処理中にエラーが発生しました。',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
