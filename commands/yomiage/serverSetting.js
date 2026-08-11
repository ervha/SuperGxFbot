const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server_setting')
    .setDescription('サーバーの読み上げ設定を変更します'),
  async execute(interaction) {
    await interaction.reply({ content: 'server_setting command placeholder', ephemeral: true });
  },
};
