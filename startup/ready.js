const { Events, ActivityType } = require('discord.js');
require('dotenv').config();
const { logging_channel_id } = process.env;

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		client.user.setActivity('Now Active!', { type: ActivityType.Playing });

		await console.log(`Ready! Logged in as ${client.user.tag}`);

		try {
			const loggingChannel = client.channels.cache.get(logging_channel_id);

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