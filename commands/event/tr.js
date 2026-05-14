const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName("tr")
		.setDescription('鳥が出たら実行')
        .addIntegerOption(option => 
            option.setName('tori_room_number')
                .setDescription('ラッピーが出た部屋の番号')
                .setRequired(true)),

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