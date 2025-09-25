const { Events } = require('discord.js');
const { prefix } = require('../config.json');

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
        if (message.author.bot || message.webhookId) return;
		if (message.content.startsWith(prefix)) return;
        await message.reply(message.content);
	},
};