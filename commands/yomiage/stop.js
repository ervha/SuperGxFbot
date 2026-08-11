const { SlashCommandBuilder, EmbedBuilder , MessageFlags } = require('discord.js');
const audioPlayer = require('../../src/audioPlayer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('再生中の音声を即時停止し待機中のキューを全削除します'),

  async execute(interaction) {
    try {
      audioPlayer.stopAudio(interaction.guildId);

      const embed = new EmbedBuilder()
        .setTitle('音声再生停止')
        .setDescription('再生中の音声を停止し、キュー内のテキストをすべてクリアしました。')
        .setColor(0xF1C40F);

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error('Failed to stop audio:', error);
      await interaction.reply({
        content: '音声停止処理中にエラーが発生しました。',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
