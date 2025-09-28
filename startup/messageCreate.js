const { Events, MessageFlags } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,

    async execute(message) {
        if (message.author.bot) return;
        const prefix = message.client.prefix;
        if (!message.content.startsWith(prefix)) return;
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        const cmd = message.client.messages.get(command);
        if (!cmd) return;
        try {
            await cmd.execute(message.client, command, args, message);
        } catch (error) {
            console.error(error);
            await message.reply({ content: 'このコマンドの実行中にエラーが発生しました', flags: MessageFlags.Ephemeral });
        }
    },
};