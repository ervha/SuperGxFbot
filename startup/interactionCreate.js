const { Events, MessageFlags } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,

	async execute(interaction) {
		if (!interaction.isCommand()) return; 

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content: 'このコマンドの実行中にエラーが発生しました', flags: MessageFlags.Ephemeral });
			} else {
				await interaction.reply({ content: 'このコマンドの実行中にエラーが発生しました', flags: MessageFlags.Ephemeral });
			}
		}
	},
};