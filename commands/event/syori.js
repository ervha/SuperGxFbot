const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const {management_role_id} = require('../../config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName("syori")
		.setDescription('鳥を処理したら実行'),

    async execute(interaction){
        if (!interaction.isCommand()) return;
		await interaction.deferReply({ });
			
		try {
			if (interaction.member.roles.cache.has(management_role_id)) {
				await interaction.editReply(`これは試験中の機能です`);
				try {
					const filePath = path.join(__dirname, './txt/room.txt')		
					const data = await fs.readFile(filePath, 'utf8')

					const lines = data.split('\n').filter(Boolean);
					lines.shift();

					await fs.writeFile(filePath, lines.join('\n'), 'utf8');

					await interaction.editReply('部屋の処理を確認しました')
				} catch (err) {
					await interaction.editReply('部屋の処理中にエラーが発生しました')
				}
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