const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setvoice')
    .setDescription('読み上げ話者を設定します'),
  async execute(interaction) {
    await interaction.reply({ content: 'setvoice command placeholder', ephemeral: true });
  },
};
