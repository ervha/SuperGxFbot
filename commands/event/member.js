const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

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
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const content = interaction.options.getInteger('max_member');

        const filePath = path.join(__dirname, './maxMember.txt');
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
			
		try {
			if (!content) return;

            try {
                await fs.writeFile(filePath, content.toString(), 'utf8');
            } catch (err) {
                console.error('Error writing to file:', err);
            }

			await interaction.channel.send(`最大人数を${content}に設定しました。`);
			await interaction.editReply({
				content: `正常にメッセージを送信しました。`,
				flags: MessageFlags.SuppressNotifications,
			});
        } catch (error) {
            await interaction.editReply({
                content: `エラーが発生しました。`,
                flags: MessageFlags.SuppressNotifications
            });
        }
	},
};