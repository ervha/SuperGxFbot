const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('botに関するヘルプを表示します。'),

    const: embed = new EmbedBuilder()
	    .setColor(0x0099FF)
        .setTitle('commands-list')
        .setDescription('プレフィックス:', congig.prefix, '\n\n★サーバーのコマンド\n詳細はコマンド入力時の説明を参照')
        .addFields("")
	    .setTimestamp(),
    
	async execute(interaction) {

		await interaction.reply({ embeds: [embed] });
	},
};