module.exports = {
    name: "delete-react",
    description: 'リアクションでメッセージを削除する',
    async execute(client,command,args,message){
        if (message.content.includes('delete')){
            const sent = await message.reply('<:3587_20250619175247:1420699809790033930>');
            const reaction = await sent.react('❌')
            
            const collectorfilter = (reaction, user) => {
                return reaction.emoji.name === '❌' && user.id === interaction.user.id;
            };

            sent.awaitReactions({ filter: collectorfilter, max: 1, time: 5000, errors: ['time'] })
                .then(() => sent.delete()) // リアクションされたら送信したメッセージを削除する
                .catch(() => reaction.remove()) // リアクションされなかったら自身で付けたリアクションを消す(必須ではない)
        }
    },
};