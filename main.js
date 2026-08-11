const fs = require('node:fs');
const path = require('node:path');
const Http = require('http');
require('dotenv').config();
const { token, prefix, port } = process.env;
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

client.prefix = prefix;

console.log("スタートアップファイルを読み込んでいます・・・");
const startupPath = path.join(__dirname, 'startup');
const startupFiles = fs.readdirSync(startupPath).filter(file => file.endsWith('.js'));

Http.createServer(function (req, res) {
	console.log('Ping received!');
	res.write("OK");
	res.end();
}).listen(port, '0.0.0.0', () => {
	console.log(`Web server is runnning on port ${port}`);
});

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

console.log(`ロードが完了しました。`)

client.login(token);