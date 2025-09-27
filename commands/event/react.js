const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('react')
		.setDescription('指定したメッセージにリアクションを追加')
        .addStringOption(option => 
            option.setName('message_id')
                .setDescription('リアクションを追加するメッセージのID')
                .setRequired(true))
		.addStringOption(option => 
			option.setName('emoji')
				.setDescription('追加するリアクションの絵文字（省略時はデフォルトの絵文字を使用）')
				.setRequired(false)
				.addChoices(
					{ name: 'デフォルト', value: '1420699809790033930' },
					{ name: '👍', value: '👍' },
					{ name: '👎', value: '👎' },
				)),

	async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const target_message_id = interaction.options.getString('message_id');
        const reaction_emoji = interaction.options.getString('emoji') || '1420699809790033930';

        try {
            const targetMessage = await interaction.channel.messages.fetch(target_message_id);
            await targetMessage.react(reaction_emoji);
            await interaction.editReply({
                content: `メッセージID \`${target_message_id}\` にリアクションを追加しました。`,
                flags: MessageFlags.SuppressNotifications
            });
        } catch (error) {
            await interaction.editReply({
                content: `エラーが発生しました。メッセージID \`${target_message_id}\` が存在しないか、ボットにリアクション権限がありません。`,
                flags: MessageFlags.SuppressNotifications
            });
        }
	},
};