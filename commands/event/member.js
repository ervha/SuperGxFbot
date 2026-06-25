const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const {management_role_id, ownerId} = require('../../config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName("member")
		.setDescription('人数設定')
		.addIntegerOption(option => 
			option.setName('max_member')
				.setDescription('最大人数')
				.setRequired(true)),

    async execute(interaction){
        if (!interaction.isCommand()) return;
		await interaction.deferReply({ });
		const content = interaction.options.getInteger('max_member');

        const filePath = path.join(__dirname, './json/bot-config.json');
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
			
		try {
            if (interaction.member.roles.cache.has(management_role_id) || interaction.user.id === ownerId) {
				const dataToSave = {
                    maxMember: content,
                };

                await fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2), 'utf8');

                await interaction.editReply(`最大人数を${content}に設定しました。`);
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
