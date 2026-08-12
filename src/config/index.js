require('dotenv').config();

module.exports = {
  token: process.env.token || process.env.DISCORD_TOKEN,
  clientId: process.env.clientId,
  guildId: process.env.guildId,
  loggingChannelId: process.env.logging_channel_id,
  voicevoxUrl: process.env.VOICEVOX_URL || 'http://localhost:50021',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'SuperGxFbot',
  },
};
