const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const path = require('path');
const roomManager = require('../../core/roomManager');
require('dotenv').config();
const { management_role_id, ownerId } = process.env;

module.exports = {
    data: new SlashCommandBuilder()
        .setName("member")
        .setDescription('人数設定')
        .addIntegerOption(option =>
            option.setName('max_member')
                .setDescription('最大人数')
                .setRequired(true)),

    async execute(interaction) {
        if (!interaction.isCommand()) return;
        await interaction.deferReply({});
        const content = interaction.options.getInteger('max_member');

        try {
            if (interaction.member.roles.cache.has(management_role_id) || interaction.user.id === ownerId) {
                await roomManager.setMaxMember(content);

                await interaction.editReply(`最大人数を${content}に設定しました。`);
            } else {
                await interaction.editReply(`権限が付与されていません`)
            }
        } catch (error) {
            await interaction.editReply({
                content: `エラーが発生しました。`,
                flags: MessageFlags.SuppressNotifications
            });
        }
    },
};
