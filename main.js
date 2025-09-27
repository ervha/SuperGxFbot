const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, user, MessageReaction, EmbedBuilder } = require('discord.js');
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

console.log("イベントを読み込んでいます・・・");
const eventPath = path.join(__dirname, 'event');
const eventFiles = fs.readdirSync(eventPath)
for (const file of eventFiles) {
    //commandフォルダに入っているコマンドを読み込み
	const event = require(`./event/${file}`);
	//commandファイル内にあるname:でコマンドを読み込み
        client.commands.set(event.name, event);
}
console.log(`ロードが完了しました。`)

client.on("messageCreate", async message => {
    if (message.author.bot || message.webhookId) return;
    if (!message.content.startsWith(prefix)) return;
	if (interaction.isChatInputCommand()) return;
	const args = message.content
		.slice(prefix.length)
		.trim()
		.split(/ +/g); 
	const event = args.shift().toLowerCase();
        client.commands.get('event').execute(client,event,args,message);

})


client.login(token);