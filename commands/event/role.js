const { SlashCommandBuilder, MessageFlags, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
 const BUTTON_ID_PREFIX = "role_"

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('メッセージにボタンを追加して役職を付与/削除する')
        .addRoleOption(option => 
            option.setName('role')
                .setDescription('付与/削除する役職')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('button_content')
                .setDescription('ボタンの文字')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message_content')
                .setDescription('ボタンを追加するメッセージの内容')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('emoji')
                .setDescription('ボタンに表示する絵文字（省略時はデフォルトの絵文字を使用）')
                .setRequired(false)
                .addChoices(
                    { name: 'green_container', value: '1421349684793970779' },
                    { name: 'gold_container', value: '1421349677718310964' },
                    { name: 'red_container', value: '1421349670365560913' },
                )),

    async execute(interaction) {
        await interaction.reply({ content: '操作を実行しました。', flags: MessageFlags.Ephemeral });
        const RoleId = interaction.options.getRole('role').id;
        const button_content = interaction.options.getString('button_content');
        const emoji = interaction.options.getString('emoji') || '1421349684793970779';
        const message_content = interaction.options.getString('message_content');
        const Button = new ButtonBuilder()
            .setCustomId(`${BUTTON_ID_PREFIX}${RoleId}`)
            .setStyle(ButtonStyle.Primary)
            .setLabel(button_content)
            .setEmoji(emoji);

        await interaction.channel.send({
            content: message_content,
            components: [
                new ActionRowBuilder()
                    .setComponents(Button)
            ]
    	});
    }
};
