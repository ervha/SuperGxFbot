const { Events } = require('discord.js');
const { logging_channel_id } = require('../config.json');
const fs = require('fs').promises;
const path = require('path');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		await client.user.setActivity('hi!', { type: 'PLAYING' })

		await console.log(`Ready! Logged in as ${client.user.tag}`);

		try {
			const loggingChannel = client.channels.cache.get(logging_channel_id);

			const filePath = path.join(__dirname, '../commands/event/txt/room.txt')		
			const dir = path.dirname(filePath, 'utf8');
			await fs.mkdir(dir, { recursive: true });
			await fs.writeFile(filePath, '', 'utf8')

			if (loggingChannel) {
				await loggingChannel.send(`✅ Botを起動しました`);
			} else {
				console.error(`設定されたロギングチャンネルID (${logging_channel_id}) が見つかりません。`);
			}
		} catch (error) {
			console.error('起動メッセージの送信中にエラーが発生しました:', error);
		}
	},
};