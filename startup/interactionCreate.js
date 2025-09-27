const { Events, MessageFlags } = require('discord.js');
const roleButtonHandler = require('../button/role-button.js');

module.exports = {
	name: Events.InteractionCreate,

	async execute(interaction) {
		if (interaction.isCommand()){

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
		} else if (interaction.isButton()){
			if (interaction.customId.startsWith("role_")) {
				try {
					await roleButtonHandler.execute(interaction);
				} catch (error) {
					console.error('Role button execution error:', error);
					if (interaction.replied || interaction.deferred) {
						await interaction.followUp({ content: '役職ボタンの実行中にエラーが発生しました', flags: MessageFlags.Ephemeral });
					} else {
						await interaction.reply({ content: '役職ボタンの実行中にエラーが発生しました', flags: MessageFlags.Ephemeral });
					}
				}
			} else {
				const button = interaction.client.buttons.get(interaction.buttonId);
				if (button) {
					try {
						await button.execute(interaction);
					} catch (error) {
						if (interaction.replied || interaction.deferred) {
							await interaction.followUp({ content: 'このボタンの実行中にエラーが発生しました', flags: MessageFlags.Ephemeral });
						} else {
							await interaction.reply({ content: 'このボタンの実行中にエラーが発生しました', flags: MessageFlags.Ephemeral });
						}
					}
				}
			}
		} else if (interaction.isStringSelectMenu()) {
			// respond to the select menu
		}
	},
};