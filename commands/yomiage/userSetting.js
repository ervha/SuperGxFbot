const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('user_setting')
    .setDescription('ユーザーの読み上げパラメータを設定します'),
  async execute(interaction) {
    await interaction.reply({ content: 'user_setting command placeholder', ephemeral: true });
  },
};
