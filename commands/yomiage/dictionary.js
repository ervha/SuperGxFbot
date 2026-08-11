const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dict')
    .setDescription('辞書設定を管理します')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('辞書に単語を追加または更新します')
        .addStringOption(opt => opt.setName('word').setDescription('単語').setRequired(true))
        .addStringOption(opt => opt.setName('reading').setDescription('読み方').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('辞書から単語を削除します')
        .addStringOption(opt => opt.setName('word').setDescription('単語').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('登録済みの辞書一覧を表示します')
    ),
  async execute(interaction) {
    await interaction.reply({ content: 'dict command placeholder', ephemeral: true });
  },
};
