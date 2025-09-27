const { ContextMenuCommandBuilder, ApplicationCommandType, PermissionsBitField, MessageFlags } = require('discord.js');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Pin Message')
        .setType(ApplicationCommandType.Message),

    async execute(interaction) {
        if (!interaction.isMessageContextMenuCommand()) return;
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        if (!interaction.guild) return interaction.editReply({ content: "このコマンドはサーバー内でのみ実行できます。" });
        const { channel } = interaction;

        const botPermissions = channel.permissionsFor(interaction.client.user);
        if (!botPermissions.has(PermissionsBitField.Flags.ViewChannel)) return interaction.editReply({
                content: "BOTにチャンネル閲覧の権限がありません。",
        });
        if (!botPermissions.has(PermissionsBitField.Flags.ManageMessages)) return interaction.editReply({
                content: "BOTに**メッセージ管理**の権限がありません。ピン留め/解除にはこの権限が必要です。",
        });

        const message = interaction.targetMessage;

        if (message.system) return interaction.editReply({
            content: "システムメッセージはピン留めができません。",
        });

        try {
            if (message.pinned){
                await message.unpin();
                await interaction.editReply({ 
                    content: `✅ メッセージのピン留めを解除しました。`
                });
            } else {
                await message.pin();
                await interaction.editReply({
                    content: `📌 メッセージをピン留めしました。`
                });
            }
        } catch (error) {
            console.error("ピン留め/解除中にエラーが発生しました:", error);
            await interaction.editReply({
                content: "❌ ピン留め/解除中に予期せぬエラーが発生しました。",
            });
        }
    },
};