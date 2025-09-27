const { Events, MessageFlags } = require('discord.js');

module.exports = {
    name: 'button_hundler',

    async execute(interaction) {
        if (!interaction.isButton()) return;
        if (interaction.customId.startsWith("role_")) {
            try {
                await interaction.client.buttons.get('role-button').execute(interaction);
            } catch (error) {
                console.error('Role button execution error:', error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: '役職ボタンの実行中にエラーが発生しました', flags: MessageFlags.Ephemeral });
                } else {
                    await interaction.reply({ content: '役職ボタンの実行中にエラーが発生しました', flags: MessageFlags.Ephemeral });
                }
            }
        } else {
            const button = interaction.client.buttons.get(interaction.buttonId);
            if (button) {
                try {
                    await button.execute(interaction);
                } catch (error) {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content: 'このボタンの実行中にエラーが発生しました', flags: MessageFlags.Ephemeral });
                    } else {
                        await interaction.reply({ content: 'このボタンの実行中にエラーが発生しました', flags: MessageFlags.Ephemeral });
                    }
                }
            }
        }
    }
};