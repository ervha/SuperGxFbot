const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
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

    const options = [];
    if (speakersData && speakersData.length > 0) {
      for (const speaker of speakersData) {
        if (!speaker.styles) continue;
        for (const style of speaker.styles) {
          if (options.length >= 25) break;
          options.push({
            label: `${speaker.name} (${style.name})`,
            value: String(style.id),
            description: `話者ID: ${style.id}`,
            default: style.id === userSetting.speaker_id,
          });
        }
        if (options.length >= 25) break;
      }
    }

    if (options.length === 0) {
      options.push(
        { label: '四国めたん (ノーマル)', value: '2', default: userSetting.speaker_id === 2 },
        { label: 'ずんだもん (ノーマル)', value: '3', default: userSetting.speaker_id === 3 },
        { label: '春日部つむぎ (ノーマル)', value: '8', default: userSetting.speaker_id === 8 },
        { label: '雨晴はう (ノーマル)', value: '10', default: userSetting.speaker_id === 10 },
        { label: '波音リツ (ノーマル)', value: '9', default: userSetting.speaker_id === 9 }
      );
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_voice_speaker')
      .setPlaceholder('話者とスタイルを選択してください')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
      .setTitle('読み上げ話者設定')
      .setDescription(`現在の設定話者ID: ${userSetting.speaker_id}\n下のセレクトメニューから設定したい話者を選択してください。`)
      .setColor(0x3498DB);

    const response = await interaction.reply({
      embeds: [embed],
      components: [row],
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

      const newSpeakerId = parseInt(i.values[0], 10);
      await dataManager.setUserSetting(interaction.user.id, { speaker_id: newSpeakerId });

      const updatedEmbed = new EmbedBuilder()
        .setTitle('読み上げ話者設定完了')
        .setDescription(`話者を ID: ${newSpeakerId} に更新しました。`)
        .setColor(0x2ECC71);

      await i.update({
        embeds: [updatedEmbed],
        components: [],
      });
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'time' && collected.size === 0) {
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
