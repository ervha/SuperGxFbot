const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const {management_role_id} = require('../../config.json');

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

        const filePath = path.join(__dirname, './txt/maxMember.txt');
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
			
		try {
			if (!content) return;
            if (interaction.member.roles.cache.has(management_role_id)) {
                try {
                    await fs.writeFile(filePath, content.toString(), 'utf8');
                } catch (err) {
                    console.error('Error writing to file:', err);
                }

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