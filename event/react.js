module.exports = {
	name: "react",
	description: 'リアクションを付ける',
    async execute(client,command,args,message){
		if (message.content.includes('react')){
        	await message.channel.send('<:3587_20250619175247:1420699809790033930>');
		}
	},
};