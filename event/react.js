const { prefix } = require('../config.json');

module.exports = {
	name: "react",
	description: 'リアクションを送信',
    async execute(client,command,args,message){
		if (message.content.includes('react')){
            const content = message.content.slice(`${prefix}${command}`.length).trim();
			const match_message_id = content.match(/(\d{17,19})/);
			// メッセージIDが抽出できたか確認
            if (!match_message_id) {
                return message.reply('メッセージIDが見つかりませんでした。コマンド形式は `!react <メッセージID>` です。');
            }
			const target_message_id = match_message_id[0];
			const reaction_emoji = '1420699809790033930'

			try {
                // 同じチャンネル内の指定されたIDのメッセージを取得
                const targetMessage = await message.channel.messages.fetch(target_message_id);
                
                await targetMessage.react(reaction_emoji);
                await message.reply(`メッセージID \`${target_message_id}\` にリアクションを追加しました。`);
                
            } catch (error) {
                await message.reply(`エラーが発生しました。メッセージID \`${target_message_id}\` が存在しないか、権限がありません。`);
            }
		}
	},
};