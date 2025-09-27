const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("delete-react")
        .setDescription('リアクションでメッセージを削除する'),
    
    async execute(interaction){
        await interaction.reply({ content: '操作が完了しました。', ephemeral: true });
        const sent = await interaction.channel.send({ content: '<:3587_20250619175247:1420699809790033930>' });
        const reaction = await sent.react('❌');
        
        const Filter = (reaction, user) => {
            return reaction.emoji.name === '❌' && user.id === interaction.user.id;
        };
        
        try {
            const collected = await sent.awaitReactions({ filter: Filter, max: 1, time: 5000, errors: ['time']});

            if (collected.size > 0) {
                await sent.delete();
            }

        } catch (error) {
            if (reaction) {
                await reaction.remove().catch(e => console.error("リアクションの削除中にエラーが発生:", e));
            } else {
            }
        }
    },
};