const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('botに関するヘルプを表示します。'),

	async execute(interaction) {
        const embed = new EmbedBuilder()
	    .setColor(0x0099FF)
        .setTitle('commands-list')
        .setDescription('\n\n★サーバーのコマンド\n詳細はコマンド入力時の説明を参照')
        .addFields(
            { name: '/help', value: 'botに関するヘルプを表示します。' },
            { name: '/ping', value: 'Botの応答速度を確認します。' },
            { name: '/server', value: 'サーバーの情報を表示します。' },
            { name: '/user', value: 'ユーザーの情報を表示します。' },
        )
	    .setTimestamp()

		await interaction.reply({ embeds: [embed] });
	},
};