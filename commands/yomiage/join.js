const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('ボイスチャンネルに参加し読み上げを開始します'),
  async execute(interaction) {
    await interaction.reply({ content: 'join command placeholder', ephemeral: true });
  },
};
