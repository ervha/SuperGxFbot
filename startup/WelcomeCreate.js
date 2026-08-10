const { Client, GatewayIntentBits } = require('discord.js');
const { welcome_server_id, welcome_channel_id } = require('../config.json');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const targetGuildId = welcome_server_id;
const channelId = welcome_channel_id;

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);

  // 任意のタイミング（今回は起動時）で特定のサーバー情報を取得
  const guild = client.guilds.cache.get(targetGuildId);
  if (guild) {
    console.log(`サーバー名: ${guild.name}`);
    console.log(`メンバー数: ${guild.memberCount}`);
  } else {
    console.log('指定されたサーバーが見つかりませんでした。');
  }
});

client.on('guildMemberAdd', member => {
  // 参加したサーバーが対象のサーバーではない場合、処理を終了する
  if (member.guild.id !== targetGuildId) return;

  const channel = member.guild.channels.cache.get(channelId);

  if (channel) {
    channel.send(`${member.user.tag}さん、サーバーへようこそ。`);
  }
});

client.login('あなたのボットのトークン');