const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const {management_role_id, owner_role_id} = require('../../config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName("show")
		.setDescription('現在の最大人数を表示'),

    async execute(interaction){
        if (!interaction.isCommand()) return;
		await interaction.deferReply({ });
        
        const filePath = path.join(__dirname, './txt/maxMember.txt');
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });

		const data = await fs.readFile(filePath, 'utf8');
        const maxMemberValue = Number(data.trim());

		try {
			if (!maxMemberValue || isNaN(maxMemberValue)) return;
			if (interaction.member.roles.cache.has(management_role_id) || interaction.member.roles.cache.has(owner_role_id)) {
				await interaction.editReply(`現在の最大人数は${maxMemberValue}です。`);
			} else {
				await interaction.editReply(`権限が付与されていません`)
			}
        } catch (error) {
            await interaction.editReply({
                content: `エラーが発生しました。`,
                flags: MessageFlags.SuppressNotifications
            });
        }
	},
};