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
    const speakersData = await voicevox.getSpeakers() || [];

    // ステップ1: キャラクター(モデル)のリストを作成
    const characterOptions = [];
    speakersData.forEach(speaker => {
      if (!speaker.styles || speaker.styles.length === 0) return;
      characterOptions.push({
        label: speaker.name.substring(0, 100),
        value: speaker.speaker_uuid, // UUIDを識別子として使う
        description: `スタイル数: ${speaker.styles.length}`
      });
    });

    if (characterOptions.length === 0) {
      characterOptions.push(
        { label: '四国めたん', value: 'fallback_metan', description: 'スタイル数: 1' },
        { label: 'ずんだもん', value: 'fallback_zunda', description: 'スタイル数: 1' }
      );
    }

    let currentPage = 0;
    const maxPage = Math.ceil(characterOptions.length / 25) - 1;

    // --- キャラクター選択画面を構築する関数 ---
    const buildCharacterOptions = (page) => {
      const start = page * 25;
      const end = start + 25;
      const currentOptions = characterOptions.slice(start, end);

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_voice_character')
        .setPlaceholder(`キャラクターを選択 (ページ ${page + 1}/${maxPage + 1})`)
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
        .setTitle('Step 1: キャラクターの選択')
        .setDescription(`現在の設定話者ID: ${userSetting.speaker_id}\n\nまずは声のベースとなる「キャラクター」を選択してください。`)
        .setColor(0x3498DB);

      return { embeds: [embed], components: [rowSelect, rowButtons] };
    };

    // --- スタイル選択画面を構築する関数 ---
    const buildStyleOptions = (speakerUuid) => {
      const speaker = speakersData.find(s => s.speaker_uuid === speakerUuid);
      const styleOptions = speaker.styles.map(style => {
        const isCurrent = String(style.id) === String(userSetting.speaker_id);
        return {
          label: style.name.substring(0, 100),
          value: String(style.id),
          description: isCurrent ? `話者ID: ${style.id} (現在選択中)` : `話者ID: ${style.id}`
        };
      });
      
      // スタイルリストの作成（25種類を超えるキャラはVoicevoxにはほぼいないためページネーション省略）
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_voice_style')
        .setPlaceholder(`${speaker.name} のスタイルを選択`)
        .addOptions(styleOptions);
        
      const rowSelect = new ActionRowBuilder().addComponents(selectMenu);
      
      const btnBack = new ButtonBuilder()
        .setCustomId('back_to_character')
        .setLabel('◀ キャラクター選択に戻る')
        .setStyle(ButtonStyle.Danger);
        
      const rowButtons = new ActionRowBuilder().addComponents(btnBack);
      
      const embed = new EmbedBuilder()
        .setTitle(`Step 2: ${speaker.name} のスタイル選択`)
        .setDescription(`次に、${speaker.name} の声のスタイル（感情やトーン）を選択してください。`)
        .setColor(0xF39C12);
        
      return { embeds: [embed], components: [rowSelect, rowButtons] };
    };

    // 最初にキャラクター選択画面を送信
    const response = await interaction.reply({
      ...buildCharacterOptions(currentPage),
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

      if (i.isStringSelectMenu()) {
        if (i.customId === 'select_voice_character') {
          // キャラクターが選ばれたら、スタイル選択画面（Step 2）へ移行
          const selectedUuid = i.values[0];
          await i.update(buildStyleOptions(selectedUuid));
        } else if (i.customId === 'select_voice_style') {
          // スタイルが選ばれたら設定を保存して終了
          const newSpeakerId = parseInt(i.values[0], 10);
          await dataManager.setUserSetting(interaction.user.id, { speaker_id: newSpeakerId });
          userSetting.speaker_id = newSpeakerId;

          const updatedEmbed = new EmbedBuilder()
            .setTitle('✅ 読み上げ設定完了！')
            .setDescription(`声を ID: ${newSpeakerId} に更新しました。\nさっそくチャットで何か喋らせてみてください！`)
            .setColor(0x2ECC71);

          await i.update({
            embeds: [updatedEmbed],
            components: [],
          });
          collector.stop('selected');
        }
      } else if (i.isButton()) {
        if (i.customId === 'prev_page' && currentPage > 0) {
          currentPage--;
          await i.update(buildCharacterOptions(currentPage));
        } else if (i.customId === 'next_page' && currentPage < maxPage) {
          currentPage++;
          await i.update(buildCharacterOptions(currentPage));
        } else if (i.customId === 'back_to_character') {
          // 「戻る」ボタンが押されたらキャラクター選択画面（Step 1）へ戻る
          await i.update(buildCharacterOptions(currentPage));
        }
      }
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'time') {
        const timeoutEmbed = new EmbedBuilder()
          .setTitle('⏳ 読み上げ設定タイムアウト')
          .setDescription('一定時間操作がなかったため終了しました。再度コマンドを実行してください。')
          .setColor(0x95A5A6);

        await interaction.editReply({
          embeds: [timeoutEmbed],
          components: [],
        }).catch(() => {});
      }
    });
  },
};
