const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('再生中の音声を停止しキューを消去します'),
  async execute(interaction) {
    await interaction.reply({ content: 'stop command placeholder', ephemeral: true });
  },
};
