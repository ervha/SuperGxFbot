const fs = require('node:fs');
const path = require('node:path');
const Http = require('http');
require('dotenv').config();
const { token } = process.env;
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildScheduledEvents,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMessagePolls,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.MessageContent
	],
	disableMentions: 'everyone',
	partials: [
		Partials.Channel,
		Partials.GuildMember,
		Partials.Message,
		Partials.Reaction,
		Partials.User],
});

console.log("スタートアップファイルを読み込んでいます・・・");
const eventsPath = path.join(__dirname, 'src', 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const event = require(`./src/events/${file}`);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

console.log("コマンドを読み込んでいます・・・");
client.commands = new Collection();

const foldersPath = path.join(__dirname, 'src', 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

console.log(`ロードが完了しました。`)

// ==========================================
// グローバル・セーフティネット（クラッシュ防止）
// ==========================================
process.on('unhandledRejection', async (reason, promise) => {
	try {
		const ownerId = process.env.ownerId;
		if (ownerId && client.isReady()) {
			const owner = await client.users.fetch(ownerId);
			if (owner) {
				owner.send(`⚠️ **[セーフティネット作動]**\n想定外の非同期エラー(Unhandled Rejection)をキャッチしてクラッシュを防止しました。\n\`\`\`\n${reason.stack || reason}\n\`\`\``).catch(() => {});
			}
		}
	} catch (e) {
		// DM送信失敗時は無視
	}
});

process.on('uncaughtException', async (error) => {
	// @discordjs/voice の切断処理時の既知のエラー（UDPソケットが既に閉じられているのに送信しようとした）は無視する
	if (error && error.code === 'ERR_SOCKET_DGRAM_NOT_RUNNING') {
		return;
	}

	try {
		const ownerId = process.env.ownerId;
		if (ownerId && client.isReady()) {
			const owner = await client.users.fetch(ownerId);
			if (owner) {
				owner.send(`🚨 **[重大エラー回避]**\n想定外の致命的エラー(Uncaught Exception)をキャッチしてクラッシュを防止しました。\n\`\`\`\n${error.stack || error}\n\`\`\``).catch(() => {});
			}
		}
	} catch (e) {
		// DM送信失敗時は無視
	}
});

client.login(token);