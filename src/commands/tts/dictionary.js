const { SlashCommandBuilder, EmbedBuilder, MessageFlags, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const dataManager = require('../../core/dataManager');

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
      let dictList = dataManager.getDictionary(guildId);
      if (dictList.length === 0) {
        await interaction.reply({ content: '現在登録されている辞書単語はありません。', flags: MessageFlags.Ephemeral });
        return;
      }

      let currentPage = 0;
      let maxPage = Math.ceil(dictList.length / 25) - 1;
      let selectedWord = null;

      const generateComponents = (page) => {
        const start = page * 25;
        const end = start + 25;
        const currentItems = dictList.slice(start, end);

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('dict_remove_select')
          .setPlaceholder('削除する単語を選択してください')
          .addOptions(
            currentItems.map(item => new StringSelectMenuOptionBuilder()
              .setLabel(item.word.length > 25 ? item.word.substring(0, 22) + '...' : item.word)
              .setDescription(item.reading.length > 50 ? item.reading.substring(0, 47) + '...' : item.reading)
              .setValue(item.word.length > 100 ? item.word.substring(0, 100) : item.word)
            )
          );

        const row1 = new ActionRowBuilder().addComponents(selectMenu);

        const prevButton = new ButtonBuilder()
          .setCustomId('dict_remove_prev')
          .setLabel('◀ 前へ')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0);

        const nextButton = new ButtonBuilder()
          .setCustomId('dict_remove_next')
          .setLabel('次へ ▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === maxPage);

        const row2 = new ActionRowBuilder().addComponents(prevButton, nextButton);
        
        return [row1, row2];
      };

      const generateEmbed = (page) => {
        return new EmbedBuilder()
          .setTitle('削除する辞書単語を選択')
          .setDescription(`ページ ${page + 1}/${maxPage + 1}`)
          .setColor(0xE74C3C);
      };

      const response = await interaction.reply({
        embeds: [generateEmbed(currentPage)],
        components: generateComponents(currentPage),
        flags: MessageFlags.Ephemeral
      });

      const collector = response.createMessageComponentCollector({ time: 120000 });

      collector.on('collect', async i => {
        if (i.customId === 'dict_remove_prev') {
          currentPage = Math.max(0, currentPage - 1);
          await i.update({ embeds: [generateEmbed(currentPage)], components: generateComponents(currentPage) });
        } else if (i.customId === 'dict_remove_next') {
          currentPage = Math.min(maxPage, currentPage + 1);
          await i.update({ embeds: [generateEmbed(currentPage)], components: generateComponents(currentPage) });
        } else if (i.customId === 'dict_remove_select') {
          selectedWord = i.values[0];
          const confirmEmbed = new EmbedBuilder()
            .setTitle('削除の確認')
            .setDescription(`本当に単語 \`${selectedWord}\` を削除しますか？`)
            .setColor(0xF1C40F);
            
          const confirmBtn = new ButtonBuilder().setCustomId('dict_remove_confirm').setLabel('削除する').setStyle(ButtonStyle.Danger);
          const cancelBtn = new ButtonBuilder().setCustomId('dict_remove_cancel').setLabel('キャンセル').setStyle(ButtonStyle.Secondary);
          const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);
          
          await i.update({ embeds: [confirmEmbed], components: [row] });
        } else if (i.customId === 'dict_remove_confirm') {
          if (selectedWord) {
            const removed = await dataManager.removeDictionaryWord(guildId, selectedWord);
            const doneEmbed = new EmbedBuilder()
              .setTitle(removed ? '削除完了' : '削除エラー')
              .setDescription(removed ? `単語 \`${selectedWord}\` を削除しました。` : `単語 \`${selectedWord}\` は既に存在しません。`)
              .setColor(removed ? 0xE74C3C : 0x95A5A6);
            
            dictList = dataManager.getDictionary(guildId);
            if (dictList.length === 0) {
              await i.update({ embeds: [doneEmbed], components: [] });
              collector.stop();
              return;
            }

            maxPage = Math.ceil(dictList.length / 25) - 1;
            if (currentPage > maxPage) currentPage = Math.max(0, maxPage);
            selectedWord = null;

            const backBtn = new ButtonBuilder().setCustomId('dict_remove_cancel').setLabel('一覧に戻る').setStyle(ButtonStyle.Primary);
            const row = new ActionRowBuilder().addComponents(backBtn);
            await i.update({ embeds: [doneEmbed], components: [row] });
          }
        } else if (i.customId === 'dict_remove_cancel') {
          await i.update({ embeds: [generateEmbed(currentPage)], components: generateComponents(currentPage) });
          selectedWord = null;
        }
      });
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
