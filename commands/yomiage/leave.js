const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('ボイスチャンネルから切断します'),
  async execute(interaction) {
    await interaction.reply({ content: 'leave command placeholder', ephemeral: true });
  },
};
