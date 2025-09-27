const { Events, MessageFlags } = require('discord.js');

module.exports = {
    name: 'selectmenu_hundler',

    async execute(interaction) {
        if (!interaction.isStringSelectMenu()) return;
        // respond to the select menu interaction
    }
};