const { Events, MessageFlags, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'role-button',

    async execute(interaction) {
        if (!interaction.isButton()) return;
        const BUTTON_ID_PREFIX = "role_"
        if (!interaction.customId.startsWith(BUTTON_ID_PREFIX)) return
        const me = await interaction.guild.members.fetchMe()
        if (!me.permissions.has(PermissionsBitField.Flags.ManageRoles)){
            return interaction.reply({
                content: "botに[ロールの管理]の権限がありません。サーバーの管理者に問い合わせてください。",
                flags: MessageFlags.Ephemeral
            })
        }
        const roleId = String(interaction.customId.slice(BUTTON_ID_PREFIX.length))
        const roles = await interaction.guild.roles.fetch()
        if (!roles.has(roleId)) {
            return interaction.reply({
                content: "ロールが存在しません。サーバーの管理者に問い合わせてください。",
                flags: MessageFlags.Ephemeral
            })
        }
        const role = roles.get(roleId)
        const member = await interaction.member.fetch()
        if (member.roles.cache.has(roleId)) {
            try {
                await member.roles.remove(role)
                return interaction.reply({
                    content: `${role}を剥奪しました。`,
                flags: MessageFlags.Ephemeral
                })
            } catch (error) {
                console.error(error)
                return interaction.reply({
                    content: `${role}の剥奪に失敗しました。`,
                flags: MessageFlags.Ephemeral
                    })
            }
        }
        try {
            await member.roles.add(role)
            return interaction.reply({
                content: `${role}を付与しました。`,
                flags: MessageFlags.Ephemeral
            })
        } catch (error) {
            console.error(error)
            return interaction.reply({
                content: `${role}の付与に失敗しました。`,
                flags: MessageFlags.Ephemeral
            })
        }
    }
}