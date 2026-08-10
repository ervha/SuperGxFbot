const { Client, GatewayIntentBits } = require('discord.js');
const { welcome_server_id, welcome_channel_id } = require('../config.json');

const targetGuildId = welcome_server_id;
const channelId = welcome_channel_id;

module.exports = (client) => {
  client.on('guildMemberAdd', member => {
    if (member.guild.id !== targetGuildId) return;

    const channel = member.guild.channels.cache.get(channelId);

    if (channel) {
      channel.send(`${member.user.tag}さん、サーバーへようこそ。`);
    }
  });
};