const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autojoin')
    .setDescription('自動接続設定を管理します'),
  async execute(interaction) {
    await interaction.reply({ content: 'autojoin command placeholder', ephemeral: true });
  },
};
