const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const path = require('path');
const roomManager = require('../../core/roomManager');
require('dotenv').config();
const { management_role_id, ownerId } = process.env;

module.exports = {
	data: new SlashCommandBuilder()
		.setName("show")
		.setDescription('現在の最大人数を表示'),

	async execute(interaction) {
		if (!interaction.isCommand()) return;
		await interaction.deferReply({});

		try {
			const maxMemberValue = await roomManager.getMaxMember();
			if (interaction.member.roles.cache.has(management_role_id) || interaction.user.id === ownerId) {
				await interaction.editReply(`現在の最大人数は${maxMemberValue}です。`);
			} else {
				await interaction.editReply(`権限が付与されていません`)
			}
		} catch (error) {
			// error handlers not strictly needed for ENOENT anymore since DB returns default, but keeping fallback
			if (false) {
				await interaction.editReply({
					content: `最大人数の設定が見つかりません。まずは /member コマンドで最大人数を設定してください。`,
					flags: MessageFlags.SuppressNotifications
				});
			} else {
				await interaction.editReply({
					content: `エラーが発生しました。`,
					flags: MessageFlags.SuppressNotifications
				});
			}
		}
	},
};