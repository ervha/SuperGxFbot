const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType, MessageFlags } = require('discord.js');
const dataManager = require('../../src/dataManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('user_setting')
    .setDescription('音声パラメータ（ピッチ・スピード）を対話形式で設定します'),

  async execute(interaction) {
    const userSetting = dataManager.getUserSetting(interaction.user.id);

    const pitchOptions = [
      { label: 'ピッチ: -0.15 (低)', value: '-0.15', default: userSetting.pitch === -0.15 },
      { label: 'ピッチ: -0.10', value: '-0.10', default: userSetting.pitch === -0.10 },
      { label: 'ピッチ: -0.05', value: '-0.05', default: userSetting.pitch === -0.05 },
      { label: 'ピッチ: 0.00 (標準)', value: '0.00', default: userSetting.pitch === 0.0 },
      { label: 'ピッチ: +0.05', value: '0.05', default: userSetting.pitch === 0.05 },
      { label: 'ピッチ: +0.10', value: '0.10', default: userSetting.pitch === 0.10 },
      { label: 'ピッチ: +0.15 (高)', value: '0.15', default: userSetting.pitch === 0.15 },
    ];

    const speedOptions = [
      { label: 'スピード: 0.5x (遅)', value: '0.5', default: userSetting.speed === 0.5 },
      { label: 'スピード: 0.8x', value: '0.8', default: userSetting.speed === 0.8 },
      { label: 'スピード: 1.0x (標準)', value: '1.0', default: userSetting.speed === 1.0 },
      { label: 'スピード: 1.2x', value: '1.2', default: userSetting.speed === 1.2 },
      { label: 'スピード: 1.5x', value: '1.5', default: userSetting.speed === 1.5 },
      { label: 'スピード: 2.0x (速)', value: '2.0', default: userSetting.speed === 2.0 },
    ];

    const intonationOptions = [
      { label: 'イントネーション: 0.0 (平坦)', value: '0.0', default: userSetting.intonation === 0.0 },
      { label: 'イントネーション: 0.5 (弱)', value: '0.5', default: userSetting.intonation === 0.5 },
      { label: 'イントネーション: 1.0 (標準)', value: '1.0', default: userSetting.intonation === 1.0 },
      { label: 'イントネーション: 1.5 (強)', value: '1.5', default: userSetting.intonation === 1.5 },
      { label: 'イントネーション: 2.0 (激)', value: '2.0', default: userSetting.intonation === 2.0 },
    ];

    const pitchMenu = new StringSelectMenuBuilder()
      .setCustomId('select_user_pitch')
      .setPlaceholder('ピッチを選択してください')
      .addOptions(pitchOptions);

    const speedMenu = new StringSelectMenuBuilder()
      .setCustomId('select_user_speed')
      .setPlaceholder('スピードを選択してください')
      .addOptions(speedOptions);

    const intonationMenu = new StringSelectMenuBuilder()
      .setCustomId('select_user_intonation')
      .setPlaceholder('イントネーションを選択してください')
      .addOptions(intonationOptions);

    const row1 = new ActionRowBuilder().addComponents(pitchMenu);
    const row2 = new ActionRowBuilder().addComponents(speedMenu);
    const row3 = new ActionRowBuilder().addComponents(intonationMenu);

    const buildEmbed = (current) => {
      return new EmbedBuilder()
        .setTitle('ユーザー音声パラメータ設定')
        .setDescription(
          `現在の設定:\n・ピッチ: ${current.pitch}\n・スピード: ${current.speed}\n・イントネーション: ${current.intonation}\n\n下のセレクトメニューから変更したい項目を選択してください。`
        )
        .setColor(0x9B59B6);
    };

    const response = await interaction.reply({
      embeds: [buildEmbed(userSetting)],
      components: [row1, row2, row3],
      flags: MessageFlags.Ephemeral,
    });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60000,
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({ content: '他のユーザーの操作パネルです。', flags: MessageFlags.Ephemeral });
        return;
      }

      let current = dataManager.getUserSetting(interaction.user.id);
      if (i.customId === 'select_user_pitch') {
        const pitchVal = parseFloat(i.values[0]);
        await dataManager.setUserSetting(interaction.user.id, { pitch: pitchVal });
      } else if (i.customId === 'select_user_speed') {
        const speedVal = parseFloat(i.values[0]);
        await dataManager.setUserSetting(interaction.user.id, { speed: speedVal });
      } else if (i.customId === 'select_user_intonation') {
        const intonationVal = parseFloat(i.values[0]);
        await dataManager.setUserSetting(interaction.user.id, { intonation: intonationVal });
      }

      current = dataManager.getUserSetting(interaction.user.id);
      await i.update({
        embeds: [buildEmbed(current)],
        components: [row1, row2, row3],
      });
    });
  },
};
