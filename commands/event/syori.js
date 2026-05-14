const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName("syori")
		.setDescription('鳥を処理したら実行'),

    async execute(interaction){
        if (!interaction.isCommand()) return;
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			
		try {
			await interaction.channel.send(`test`);
			await interaction.editReply({
				content: `正常にメッセージを送信しました。`,
				flags: MessageFlags.SuppressNotifications
			});
        } catch (error) {
            await interaction.editReply({
                content: `エラーが発生しました。`,
                flags: MessageFlags.SuppressNotifications
            });
        }
	},
};