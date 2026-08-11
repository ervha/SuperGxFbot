const { Events, MessageFlags } = require('discord.js');
const audioPlayer = require('../src/audioPlayer');
const dataManager = require('../src/dataManager');

function normalizeText(content, guild, dictionary) {
  let text = content;

  text = text.replace(/https?:\/\/[^\s]+/g, 'URL省略');
  text = text.replace(/\|\|.*?\|\|/g, '');

  text = text.replace(/<@!?(\d+)>/g, (match, id) => {
    const member = guild.members.cache.get(id);
    return member ? member.displayName : 'ユーザー';
  });

  text = text.replace(/<#(\d+)>/g, (match, id) => {
    const channel = guild.channels.cache.get(id);
    return channel ? channel.name : 'チャンネル';
  });

  text = text.replace(/<@&(\d+)>/g, (match, id) => {
    const role = guild.roles.cache.get(id);
    return role ? role.name : 'ロール';
  });

  text = text.replace(/<a?:([a-zA-Z0-9_]+):\d+>/g, '$1');

  if (dictionary && dictionary.length > 0) {
    for (const item of dictionary) {
      if (item.word && item.reading) {
        const regex = new RegExp(item.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        text = text.replace(regex, item.reading);
      }
    }
  }

  return text.trim();
}

module.exports = {
  name: Events.MessageCreate,

  async execute(message) {
    if (message.author.bot) return;

    const prefix = message.client.prefix;
    if (prefix && message.content.startsWith(prefix)) {
      const args = message.content.slice(prefix.length).trim().split(/ +/);
      const command = args.shift().toLowerCase();
      const cmd = message.client.messages ? message.client.messages.get(command) : null;
      if (cmd) {
        try {
          await cmd.execute(message.client, command, args, message);
        } catch (error) {
          console.error(error);
          await message.reply({ content: 'このコマンドの実行中にエラーが発生しました', flags: MessageFlags.Ephemeral });
        }
        return;
      }
    }

    if (!message.guild) return;

    const guildId = message.guild.id;
    const readChannelId = audioPlayer.getReadChannelId(guildId);

    if (readChannelId && readChannelId === message.channel.id) {
      const serverSetting = dataManager.getServerSetting(guildId);
      const dictionary = dataManager.getDictionary(guildId);
      let processed = normalizeText(message.content, message.guild, dictionary);

      if (!processed) return;

      const maxLength = serverSetting.max_length || 50;
      if (processed.length > maxLength) {
        processed = processed.substring(0, maxLength) + '以下略';
      }

      const userSetting = dataManager.getUserSetting(message.author.id);
      audioPlayer.enqueueText(guildId, processed, userSetting);
    }
  },
};