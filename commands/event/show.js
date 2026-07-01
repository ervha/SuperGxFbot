const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const {management_role_id, ownerId} = require('../../config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName("show")
		.setDescription('現在の最大人数を表示'),

    async execute(interaction){
        if (!interaction.isCommand()) return;
		await interaction.deferReply({ });
        
        const config_filePath = path.join(__dirname, './json/bot-config.json');
        const dir = path.dirname(config_filePath);
        await fs.mkdir(dir, { recursive: true });

		try {
			const data = await fs.readFile(config_filePath, 'utf8');
			const maxMemberValue = Number(JSON.parse(data).max_member);
			if (interaction.member.roles.cache.has(management_role_id) || interaction.user.id === ownerId) {
				await interaction.editReply(`現在の最大人数は${maxMemberValue}です。`);
			} else {
				await interaction.editReply(`権限が付与されていません`)
			}
        } catch (error) {
			if (error.code === 'ENOENT') {
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