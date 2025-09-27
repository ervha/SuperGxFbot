const { prefix } = require('../config.json');

module.exports = {
	name: "test",
	description: 'メッセージをそのまま返す',
    async execute(client,command,args,message){
		const content = message.content.replace(`${prefix}${command}`,'');
		if (!content) return;
	        await message.channel.send(`${content}`);
			await message.delete();
	},
};