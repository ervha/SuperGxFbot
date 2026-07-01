const { handleBosyuReaction } = require('../utils/bosyuHandler.js');

module.exports = {
	name: 'messageReactionRemove',
	async execute(reaction, user) {
		await handleBosyuReaction(reaction, user, false);
	}
};