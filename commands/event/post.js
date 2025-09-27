const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName("post")
		.setDescription('メッセージをそのまま返す')
        .addStringOption(option => 
            option.setName('message_content')
                .setDescription('botに送信させたいメッセージの内容')
                .setRequired(true)),

    async execute(interaction){
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