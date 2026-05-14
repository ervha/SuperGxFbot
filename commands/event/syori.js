const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName("syori")
		.setDescription('鳥を処理したら実行'),

    async execute(interaction){
        if (!interaction.isCommand()) return;
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const content = interaction.options.getString('message_content');
			
		try {
			if (!content) return;

			await interaction.channel.send(`${content}`);
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