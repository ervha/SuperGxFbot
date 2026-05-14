const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

module.exports = {
	data: new SlashCommandBuilder()
		.setName("show")
		.setDescription('現在の最大人数を表示'),

    async execute(interaction){
        if (!interaction.isCommand()) return;
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const filePath = path.join(__dirname, './maxMember.txt');
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });

		const data = await fs.readFile(filePath, 'utf8');
        const maxMemberValue = Number(data.trim());

		try {
			if (!maxMemberValue || isNaN(maxMemberValue)) return;

			await interaction.channel.send(`現在の最大人数は${maxMemberValue}です。`);
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