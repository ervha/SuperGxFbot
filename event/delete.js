module.exports = {
    name: "delete-react",
    description: 'リアクションでメッセージを削除する',
    async execute(client,command,args,message){
        if (message.content.includes('delete')){
            const sent = await message.channel.send({
                content: '<:3587_20250619175247:1420699809790033930>'
          });
            const reaction = await sent.react('❌');
            
            const Filter = (reaction, user) => {
                return reaction.emoji.name === '❌' && user.id === message.author.id;
            };

            try {
                // リアクションを待機（最大1つ、タイムアウトエラーを設定）
                const collected = await sent.awaitReactions({ filter: Filter, max: 1, time: 5000, errors: ['time']});

                if (collected.size > 0) {
                    await sent.delete();
                }

            } catch (error) {
                if (reaction) {
                    // Botのリアクションを削除（クリーンアップ）
                    await reaction.remove().catch(e => console.error("リアクションの削除中にエラーが発生:", e));
                } else {
                }
            }
        }
    },
};