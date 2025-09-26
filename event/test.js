module.exports = {
	name: "test",
	description: 'メッセージをそのまま返す',
    async execute(client,command,args,message){
        await message.reply(message.content);
	},
};