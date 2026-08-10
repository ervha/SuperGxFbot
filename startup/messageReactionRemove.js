const { handleBosyuReaction } = require('../src/bosyuHandler.js');

module.exports = {
	name: 'messageReactionRemove',
	async execute(reaction, user) {
		await handleBosyuReaction(reaction, user, false);
	}
};