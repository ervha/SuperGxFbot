const { REST, Routes } = require('discord.js');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { clientId, guildId, guildId2, token } = process.env;

const rest = new REST().setToken(token);

// for guild-based commands
rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] })
	.then(() => console.log('Successfully deleted all guild commands.'))
	.catch(console.error);

rest.put(Routes.applicationGuildCommands(clientId, guildId2), { body: [] })
	.then(() => console.log('Successfully deleted all guild commands.'))
	.catch(console.error);

// for guild-based commands
rest.put(Routes.applicationCommands(clientId), { body: [] })
	.then(() => console.log('Successfully deleted all commands.'))
	.catch(console.error);