const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType, MessageFlags } = require('discord.js');
const voicevox = require('../../src/voicevox');
const dataManager = require('../../src/dataManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setvoice')
    .setDescription('読み上げ話者を対話形式で選択・設定します'),

  async execute(interaction) {
    const userSetting = dataManager.getUserSetting(interaction.user.id);
    const speakersData = await voicevox.getSpeakers();

    const allOptions = [];
    if (speakersData && speakersData.length > 0) {
      for (const speaker of speakersData) {
        if (!speaker.styles) continue;
        for (const style of speaker.styles) {
          allOptions.push({
            label: `${speaker.name} (${style.name})`.substring(0, 100),
            value: String(style.id),
            description: `話者ID: ${style.id}`,
          });
        }
      }
    }

    if (allOptions.length === 0) {
      allOptions.push(
        { label: '四国めたん (ノーマル)', value: '2', description: '話者ID: 2' },
        { label: 'ずんだもん (ノーマル)', value: '3', description: '話者ID: 3' }
      );
    }

    let currentPage = 0;
    const maxPage = Math.ceil(allOptions.length / 25) - 1;

    const buildMessageOptions = (page) => {
      const start = page * 25;
      const end = start + 25;
      const currentOptions = allOptions.slice(start, end).map(opt => {
        const isCurrent = opt.value === String(userSetting.speaker_id);
        return {
          ...opt,
          description: isCurrent ? `${opt.description} (現在選択中)` : opt.description,
        };
      });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_voice_speaker')
        .setPlaceholder(`話者を選択 (ページ ${page + 1}/${maxPage + 1})`)
        .addOptions(currentOptions);

      const rowSelect = new ActionRowBuilder().addComponents(selectMenu);

      const btnPrev = new ButtonBuilder()
        .setCustomId('prev_page')
        .setLabel('◀ 前へ')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0);

      const btnNext = new ButtonBuilder()
        .setCustomId('next_page')
        .setLabel('次へ ▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === maxPage);

      const rowButtons = new ActionRowBuilder().addComponents(btnPrev, btnNext);

      const embed = new EmbedBuilder()
        .setTitle('読み上げ話者設定')
        .setDescription(`現在の設定話者ID: ${userSetting.speaker_id}\n\n総ボイス数: ${allOptions.length}\n下のメニューから設定したい話者を選択するか、ボタンでページを切り替えてください。`)
        .setColor(0x3498DB);

      return { embeds: [embed], components: [rowSelect, rowButtons] };
    };

    const response = await interaction.reply({
      ...buildMessageOptions(currentPage),
      flags: MessageFlags.Ephemeral,
    });

    const collector = response.createMessageComponentCollector({
      time: 120000,
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({ content: '他のユーザーの操作パネルです。', flags: MessageFlags.Ephemeral });
        return;
      }

      if (i.isStringSelectMenu() && i.customId === 'select_voice_speaker') {
        const newSpeakerId = parseInt(i.values[0], 10);
        await dataManager.setUserSetting(interaction.user.id, { speaker_id: newSpeakerId });
        userSetting.speaker_id = newSpeakerId;

        const updatedEmbed = new EmbedBuilder()
          .setTitle('読み上げ話者設定完了')
          .setDescription(`話者を ID: ${newSpeakerId} に更新しました。`)
          .setColor(0x2ECC71);

        await i.update({
          embeds: [updatedEmbed],
          components: [],
        });
        collector.stop('selected');
      } else if (i.isButton()) {
        if (i.customId === 'prev_page' && currentPage > 0) {
          currentPage--;
        } else if (i.customId === 'next_page' && currentPage < maxPage) {
          currentPage++;
        }
        await i.update(buildMessageOptions(currentPage));
      }
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'time') {
        const timeoutEmbed = new EmbedBuilder()
          .setTitle('読み上げ話者設定')
          .setDescription('タイムアウトしました。再度コマンドを実行してください。')
          .setColor(0x95A5A6);

        await interaction.editReply({
          embeds: [timeoutEmbed],
          components: [],
        }).catch(() => {});
      }
    });
  },
};
