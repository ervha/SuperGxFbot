const { SlashCommandBuilder, EmbedBuilder , MessageFlags } = require('discord.js');
const dataManager = require('../../src/dataManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dict')
    .setDescription('サーバー辞書を管理します')
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('単語と読み方を辞書に追加・更新します')
        .addStringOption(opt => opt.setName('word').setDescription('登録する単語').setRequired(true))
        .addStringOption(opt => opt.setName('reading').setDescription('読み方').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('単語を辞書から削除します')
        .addStringOption(opt => opt.setName('word').setDescription('削除する単語').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('登録済みの辞書一覧を表示します')
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'サーバー内で実行してください。', flags: MessageFlags.Ephemeral });
      return;
    }

    const guildId = interaction.guildId;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'add') {
      const word = interaction.options.getString('word').trim();
      const reading = interaction.options.getString('reading').trim();

      await dataManager.addDictionaryWord(guildId, word, reading);

      const embed = new EmbedBuilder()
        .setTitle('辞書登録完了')
        .setDescription(`単語: ${word}\n読み方: ${reading}\n\n上記内容で辞書に登録・更新しました。`)
        .setColor(0x2ECC71);

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } else if (subcommand === 'remove') {
      const word = interaction.options.getString('word').trim();
      const removed = await dataManager.removeDictionaryWord(guildId, word);

      const embed = new EmbedBuilder()
        .setTitle(removed ? '辞書削除完了' : '辞書削除エラー')
        .setDescription(removed ? `単語: ${word} を辞書から削除しました。` : `単語: ${word} は辞書に登録されていません。`)
        .setColor(removed ? 0xE74C3C : 0x95A5A6);

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } else if (subcommand === 'list') {
      const dictList = dataManager.getDictionary(guildId);

      if (dictList.length === 0) {
        await interaction.reply({ content: '現在登録されている辞書単語はありません。', flags: MessageFlags.Ephemeral });
        return;
      }

      const lines = dictList.map((item, index) => `${index + 1}. ${item.word} -> ${item.reading}`);
      const embed = new EmbedBuilder()
        .setTitle('登録済み辞書一覧')
        .setDescription(lines.slice(0, 25).join('\n') + (lines.length > 25 ? `\n\n他 ${lines.length - 25} 件` : ''))
        .setColor(0x3498DB);

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  },
};
