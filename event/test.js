const { Events, MessageFlags } = require('discord.js');

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
        if (message.author.bot || message.webhookId) return;
        await message.reply(message.content);
	},
};