const { Events, MessageFlags } = require('discord.js');
const audioPlayer = require('../core/audioPlayer');
const dataManager = require('../core/dataManager');

function normalizeText(content, guild, dictionary) {
  let text = content;

  text = text.replace(/https?:\/\/[^\s]+/g, 'URL省略');
  text = text.replace(/\|\|.*?\|\|/g, '');

  // スパム防止：同じ文字が4回以上連続している場合は3回に圧縮する（例：あああああ → あああ）
  // 処理負荷軽減と、不快なロングトーン読み上げを防止
  text = text.replace(/(.)\1{3,}/gu, '$1$1$1');

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
  text = text.replace(/(?<![a-zA-Z])[wｗ]{2,}(?![a-zA-Z.])/gi, '草');

  if (dictionary && dictionary.length > 0) {
    for (const item of dictionary) {
      if (item.regex && item.reading) {
        text = text.replace(item.regex, item.reading);
      }
    }
  }

  return text.trim();
}

function advancedChunkText(text) {
  // 1. まずは明確な区切り（句読点、記号、空白）で分割
  const initialChunks = text.match(/([^。！？\n、，\s　]+[。！？\n、，\s　]*)/g) || [text];

  const finalChunks = [];
  const MAX_LENGTH = 20; // 20文字以上なら強制分割の対象（ラグ防止）

  for (let chunk of initialChunks) {
    while (chunk.trim().length > MAX_LENGTH) {
      // 10文字目以降で最初に出現する「助詞（てにをは）」を探してそこで自然に分割する
      const searchTarget = chunk.substring(10);
      const match = searchTarget.match(/(て|に|を|は|が|で|と|も|から|まで|し)/);

      let splitIndex = -1;

      if (match) {
        // 助詞の直後で切る
        splitIndex = 10 + match.index + match[1].length;
      }

      // 助詞が見つかり、かつ細かすぎない場合
      if (splitIndex !== -1 && splitIndex < chunk.length - 3) {
        finalChunks.push(chunk.substring(0, splitIndex).trim());
        chunk = chunk.substring(splitIndex);
      } else {
        // 助詞が見つからない「漢字や平仮名の連続」の場合は、ラグ防止を最優先して無慈悲に20文字で強制分割
        finalChunks.push(chunk.substring(0, MAX_LENGTH).trim());
        chunk = chunk.substring(MAX_LENGTH);
      }
    }
    if (chunk.trim().length > 0) {
      finalChunks.push(chunk.trim());
    }
  }

  return finalChunks;
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
    const connectedChannelId = audioPlayer.getConnectedChannelId(guildId);

    if (
      (readChannelId && readChannelId === message.channel.id) ||
      (connectedChannelId && connectedChannelId === message.channel.id)
    ) {
      const serverSetting = dataManager.getServerSetting(guildId);
      const dictionary = dataManager.getCompiledDictionary(guildId);
      let processed = normalizeText(message.content, message.guild, dictionary);

      if (message.attachments.size > 0) {
        const hasImage = message.attachments.some(att => att.contentType && att.contentType.startsWith('image/'));
        const hasVideo = message.attachments.some(att => att.contentType && att.contentType.startsWith('video/'));
        const hasAudio = message.attachments.some(att => att.contentType && att.contentType.startsWith('audio/'));

        let attachmentText = '';
        if (hasImage) attachmentText += '画像を送信しました。';
        if (hasVideo) attachmentText += '動画を送信しました。';
        if (hasAudio) attachmentText += '音声ファイルを送信しました。';

        if (attachmentText !== '') {
          processed = processed ? processed + ' ' + attachmentText : attachmentText;
        }
      }

      if (!processed) return;

      const maxLength = serverSetting.max_length || 50;
      if (processed.length > maxLength) {
        processed = processed.substring(0, maxLength) + '以下略';
      }

      const userSetting = dataManager.getUserSetting(message.author.id);

      // 自然言語処理による高度なチャンク分割
      const chunks = advancedChunkText(processed);

      if (chunks && chunks.length > 0) {
        // メッセージ全体の文字数に基づく「自動早口」機能（最大文字数制限後）
        const totalLength = processed.length;
        let speedMultiplier = 1.0;

        if (totalLength >= 20) {
          speedMultiplier = 1.1; // 20文字以上はほんの少しだけ速く
        }

        // ユーザーの基本スピードに乗算し、上限（2.0）を超えないよう制限
        const adjustedSetting = { ...userSetting };
        adjustedSetting.speed = Math.min(2.0, Number(userSetting.speed) * speedMultiplier);

        for (const chunk of chunks) {
          audioPlayer.enqueueText(guildId, chunk, adjustedSetting);
        }
      }
    }
  },
};