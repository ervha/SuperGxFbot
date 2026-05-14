const { SlashCommandBuilder, MessageFlags } = require('discord.js');
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