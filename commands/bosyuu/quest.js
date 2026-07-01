const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('quest')
		.setDescription('新規クエストの募集モーダルを開きます'),

	async execute(interaction) {
		if (!interaction.isCommand()) return;

		const modal = new ModalBuilder()
			.setCustomId('bosyu_modal')
			.setTitle('新規クエスト募集');

		const questMenu = new TextInputBuilder()
			.setCustomId('quest_type')
			.setPlaceholder('`緊急`,`常設`,`高難易度`,`旧国`,`金策`')
			.setLabel('クエスト種類を入力してください')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

		const questOptionInput = new TextInputBuilder()
			.setCustomId('quest_option')
			.setLabel('クエスト名や周回目的、開催日時など')
			.setPlaceholder('例: 期間限定クエスト周回\n7/1 21:00〜')
			.setStyle(TextInputStyle.Paragraph)
			.setRequired(true);

		const slotsMenu = new TextInputBuilder()
			.setCustomId('slots')
			.setLabel('募集人数 → `8` (自分の分も含めてください)')
			.setPlaceholder('例: 3')
			.setStyle(TextInputStyle.Short)
			.setRequired(true);

		const overflowMenu = new TextInputBuilder()
			.setCustomId('allow_overflow')
			.setPlaceholder('`on` or `off`')
            .setLabel('満員後の追加参加設定(デフォルト: 許可する)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

		const mentionMenu = new TextInputBuilder()
			.setCustomId('mention_role')
			.setPlaceholder('`on` or `off`')
			.setLabel('募集通知を送るかどうかを設定します(デフォルト: 送る)')
			.setStyle(TextInputStyle.Short)
			.setRequired(false);

		const row1 = new ActionRowBuilder().addComponents(questMenu);
		const row2 = new ActionRowBuilder().addComponents(questOptionInput);
		const row3 = new ActionRowBuilder().addComponents(slotsMenu);
		const row4 = new ActionRowBuilder().addComponents(overflowMenu);
		const row5 = new ActionRowBuilder().addComponents(mentionMenu);

		modal.addComponents(row1, row2, row3, row4, row5);

		try {
			await interaction.showModal(modal);
		} catch (error) {
			console.error('モーダル表示エラー:', error);
		}
	}
};