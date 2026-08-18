const { Events, ActivityType } = require('discord.js');
const db = require('../core/db');
const dataManager = require('../core/dataManager');
require('dotenv').config();
const { logging_channel_id } = process.env;

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    client.user.setActivity('Now Active!', { type: ActivityType.Playing });

    console.log(`Ready! Logged in as ${client.user.tag}`);

    try {
      await db.initDatabase();
      await dataManager.loadAllData();
      
      const roomManager = require('../core/roomManager');
      await roomManager.initRoomDatabase();
      
      const { restoreConnections } = require('../core/audioPlayer');
      await restoreConnections(client);
      
      console.log('Database, cache, and voice connections initialized successfully on startup.');
    } catch (error) {
      console.error('Failed to initialize database, load cache, or restore voice connections on startup:', error);
    }

    try {
      const loggingChannel = client.channels.cache.get(logging_channel_id);

      if (loggingChannel) {
        await loggingChannel.send('Botを起動しました');
      } else {
        console.error(`設定されたロギングチャンネルID (${logging_channel_id}) が見つかりません。`);
      }
    } catch (error) {
      console.error('起動メッセージの送信中にエラーが発生しました:', error);
    }
  },
};