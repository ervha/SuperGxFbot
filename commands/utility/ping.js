const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),
	async execute(interaction) {
		const sent = await interaction.deferReply( { withResponse: true, flags: MessageFlags.Ephemeral } );
		await interaction.editReply(`Pong! ${sent.resource.message.createdTimestamp - interaction.createdTimestamp}ms`);
	},
};