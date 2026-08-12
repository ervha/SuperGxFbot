const { Events, MessageFlags, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();
const { QUEST_ROLE_IDS } = process.env;

module.exports = {
	name: Events.InteractionCreate,

	async execute(interaction) {
		if (interaction.isCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);
			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}
			try {
				await command.execute(interaction);
			} catch (error) {
				console.error(`Error executing ${interaction.commandName}:`, error);
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({ content: 'このコマンドの実行中にエラーが発生しました', flags: MessageFlags.Ephemeral });
				} else {
					await interaction.reply({ content: 'このコマンドの実行中にエラーが発生しました', flags: MessageFlags.Ephemeral });
				}
			}
		}
		if (interaction.isAutocomplete()) {
			const command = interaction.client.commands.get(interaction.commandName);
			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}
			try {
				await command.autocomplete(interaction);
			}
			catch (error) {
				console.error(error);
			}
		}

	},
};