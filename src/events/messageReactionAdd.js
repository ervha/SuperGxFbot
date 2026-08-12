const { handleBosyuReaction } = require('../core/bosyuHandler.js');

module.exports = {
	name: 'messageReactionAdd',
	async execute(reaction, user) {
		await handleBosyuReaction(reaction, user, true);
	}
};