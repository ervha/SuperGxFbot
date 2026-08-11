const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ComponentType,
} = require('discord.js');
const dataManager = require('../../src/dataManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server_setting')
    .setDescription('サーバーの読み上げ上限文字数や入室アナウンス設定を管理します'),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'サーバー内で実行してください。', ephemeral: true });
      return;
    }

    const guildId = interaction.guildId;

    const buildComponents = (current) => {
      const noticeButton = new ButtonBuilder()
        .setCustomId('toggle_notice')
        .setLabel(current.join_notice_enabled ? '入室アナウンス: 有効' : '入室アナウンス: 無効')
        .setStyle(current.join_notice_enabled ? ButtonStyle.Success : ButtonStyle.Secondary);

      const lengthSelect = new StringSelectMenuBuilder()
        .setCustomId('select_max_length')
        .setPlaceholder('上限文字数を選択してください')
        .addOptions([
          { label: '30文字', value: '30', default: current.max_length === 30 },
          { label: '50文字 (標準)', value: '50', default: current.max_length === 50 },
          { label: '70文字', value: '70', default: current.max_length === 70 },
          { label: '100文字', value: '100', default: current.max_length === 100 },
          { label: '150文字', value: '150', default: current.max_length === 150 },
        ]);

      const row1 = new ActionRowBuilder().addComponents(noticeButton);
      const row2 = new ActionRowBuilder().addComponents(lengthSelect);
      return [row1, row2];
    };

    const buildEmbed = (current) => {
      return new EmbedBuilder()
        .setTitle('サーバー読み上げ設定パネル')
        .setDescription(
          `現在の設定:\n・上限文字数: ${current.max_length}文字\n・入室アナウンス: ${current.join_notice_enabled ? '有効' : '無効'}\n\n下のボタン・セレクトメニューで変更できます。`
        )
        .setColor(0x1ABC9C);
    };

    let currentSetting = dataManager.getServerSetting(guildId);

    const response = await interaction.reply({
      embeds: [buildEmbed(currentSetting)],
      components: buildComponents(currentSetting),
      ephemeral: true,
    });

    const collector = response.createMessageComponentCollector({
      time: 60000,
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({ content: '他のユーザーの操作パネルです。', ephemeral: true });
        return;
      }

      currentSetting = dataManager.getServerSetting(guildId);

      if (i.customId === 'toggle_notice') {
        const newNoticeState = !currentSetting.join_notice_enabled;
        await dataManager.setServerSetting(guildId, { join_notice_enabled: newNoticeState });
      } else if (i.customId === 'select_max_length' && i.isStringSelectMenu()) {
        const newLength = parseInt(i.values[0], 10);
        await dataManager.setServerSetting(guildId, { max_length: newLength });
      }

      currentSetting = dataManager.getServerSetting(guildId);

      await i.update({
        embeds: [buildEmbed(currentSetting)],
        components: buildComponents(currentSetting),
      });
    });
  },
};
