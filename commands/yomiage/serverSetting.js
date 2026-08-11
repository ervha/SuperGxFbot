const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ComponentType, MessageFlags } = require('discord.js');
const dataManager = require('../../src/dataManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server_setting')
    .setDescription('サーバーの読み上げ上限文字数や入室アナウンス設定を管理します'),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'サーバー内で実行してください。', flags: MessageFlags.Ephemeral });
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

      const volumeSelect = new StringSelectMenuBuilder()
        .setCustomId('select_volume')
        .setPlaceholder('読み上げ音量を選択してください')
        .addOptions([
          { label: '音量: 0.5', value: '0.5', default: current.volume === 0.5 },
          { label: '音量: 0.8', value: '0.8', default: current.volume === 0.8 },
          { label: '音量: 1.0 (標準)', value: '1.0', default: current.volume === 1.0 },
          { label: '音量: 1.5', value: '1.5', default: current.volume === 1.5 },
          { label: '音量: 2.0 (最大)', value: '2.0', default: current.volume === 2.0 },
        ]);

      const row1 = new ActionRowBuilder().addComponents(noticeButton);
      const row2 = new ActionRowBuilder().addComponents(lengthSelect);
      const row3 = new ActionRowBuilder().addComponents(volumeSelect);
      return [row1, row2, row3];
    };

    const buildEmbed = (current) => {
      return new EmbedBuilder()
        .setTitle('サーバー読み上げ設定パネル')
        .setDescription(
          `現在の設定:\n・上限文字数: ${current.max_length}文字\n・入室アナウンス: ${current.join_notice_enabled ? '有効' : '無効'}\n・読み上げ音量: ${current.volume}\n\n下のボタン・セレクトメニューで変更できます。`
        )
        .setColor(0x1ABC9C);
    };

    let currentSetting = dataManager.getServerSetting(guildId);

    const response = await interaction.reply({
      embeds: [buildEmbed(currentSetting)],
      components: buildComponents(currentSetting),
      flags: MessageFlags.Ephemeral,
    });

    const collector = response.createMessageComponentCollector({
      time: 60000,
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({ content: '他のユーザーの操作パネルです。', flags: MessageFlags.Ephemeral });
        return;
      }

      currentSetting = dataManager.getServerSetting(guildId);

      if (i.customId === 'toggle_notice') {
        const newNoticeState = !currentSetting.join_notice_enabled;
        await dataManager.setServerSetting(guildId, { join_notice_enabled: newNoticeState });
      } else if (i.customId === 'select_max_length' && i.isStringSelectMenu()) {
        const newLength = parseInt(i.values[0], 10);
        await dataManager.setServerSetting(guildId, { max_length: newLength });
      } else if (i.customId === 'select_volume' && i.isStringSelectMenu()) {
        const newVolume = parseFloat(i.values[0]);
        await dataManager.setServerSetting(guildId, { volume: newVolume });
      }

      currentSetting = dataManager.getServerSetting(guildId);

      await i.update({
        embeds: [buildEmbed(currentSetting)],
        components: buildComponents(currentSetting),
      });
    });
  },
};
