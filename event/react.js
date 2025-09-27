module.exports = {
	name: "react",
	description: 'リアクションを付ける',
    async execute(client,command,args,message){
		if (message.content.includes('react')){
        	await message.channel.send('<:reiun:1420699809790033930>');
		}
	},
};