const { Events } = require('discord.js');
const { prefix } = require('../config.json');

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
        if (message.author.bot || message.webhookId) return;
		if (!message.content.startsWith(prefix)) return;
		if (message.content.includes('post')){
        	await message.react('<:3587_20250619175247:1420699809790033930>');
		}
	},
};