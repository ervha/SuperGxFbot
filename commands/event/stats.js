const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const { management_role_id, ownerId } = require('../../config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName("stats")
		.setDescription('処理統計の確認・リセット')
		.addSubcommand(subcommand =>
			subcommand
				.setName('view')
				.setDescription('現在の処理部屋数を表示します'))
		.addSubcommand(subcommand =>
			subcommand
				.setName('reset')
				.setDescription('現在の処理部屋数を手動でリセットします')),

	async execute(interaction) {
		if (!interaction.isCommand()) return;
		await interaction.deferReply({});

		const filePath = path.join(__dirname, './json/bot-config.json');
		const subcommand = interaction.options.getSubcommand();

		try {
			if (interaction.member.roles.cache.has(management_role_id) || interaction.user.id === ownerId) {
				await interaction.editReply(`権限が付与されていません`);
				return;
			}

			let config = {};
			try {
				const fileData = await fs.readFile(filePath, 'utf8');
				config = JSON.parse(fileData);
			} catch (e) {
				config = {};
			}

			if (!config.stats) {
				config.stats = {
					todayCount: 0
				};
			}

			if (subcommand === 'view') {
				await interaction.editReply(`・現在の処理部屋数: ${config.stats.todayCount} 部屋`);
			} else if (subcommand === 'reset') {
				config.stats.todayCount = 0;
				await fs.writeFile(filePath, JSON.stringify(config, null, 2), 'utf8');
				await interaction.editReply(`処理部屋数のカウントをリセットしました。`);
			}

		} catch (error) {
			console.error('stats内部エラー:', error);
			await interaction.editReply({
				content: `エラーが発生しました。`,
				flags: MessageFlags.SuppressNotifications
			});
		}
	},
};
