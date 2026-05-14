const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { token, prefix } = require('./config.json');
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
});

console.log("スタートアップファイルを読み込んでいます・・・");
const startupPath = path.join(__dirname, 'startup');
const startupFiles = fs.readdirSync(startupPath).filter(file => file.endsWith('.js'));

for (const file of startupFiles) {
	const filePath = path.join(startupPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

console.log("コマンドを読み込んでいます・・・");
client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
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

client.messages = new Collection();
const messagesPath = path.join(__dirname, 'message');
const messageFiles = fs.readdirSync(messagesPath).filter(file => file.endsWith('.js'));
for (const file of messageFiles) {
	const filePath = path.join(messagesPath, file);
	const message = require(filePath);
	if ('name' in message && 'execute' in message) {
		client.messages.set(message.name, message);
	} else {
		console.log(`[WARNING] The message at ${filePath} is missing a required "name" or "execute" property.`);
	}
}

console.log(`ロードが完了しました。`)

client.login(token);