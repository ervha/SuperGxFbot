const { EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

async function handleBosyuReaction(reaction, user, isAdd) {
	if (user.bot) return;

	if (reaction.partial) {
		try {
			await reaction.fetch();
		} catch (error) {
			return;
		}
	}

	if (reaction.emoji.name !== '✅') return;

	const filePath = path.join(__dirname, '../commands/json/quests.json');

	try {
		let bosyuData = [];
		try {
			const raw = await fs.readFile(filePath, 'utf8');
			bosyuData = JSON.parse(raw);
		} catch (e) {
			return;
		}

		const targetMsgId = reaction.message.id;
		const index = bosyuData.findIndex(b => b.messageId === targetMsgId);
		if (index === -1) return;

		const currentBosyu = bosyuData[index];
		const userId = user.id;
		let updated = false;

		if (isAdd) {
			if (!currentBosyu.participants.includes(userId)) {
				if (currentBosyu.participants.length < currentBosyu.maxSlots || currentBosyu.allowOverflow) {
					currentBosyu.participants.push(userId);
					updated = true;
				} else {
					await reaction.users.remove(userId).catch(() => {});
				}
			}
		} else {
			const pIndex = currentBosyu.participants.indexOf(userId);
			if (pIndex !== -1) {
				currentBosyu.participants.splice(pIndex, 1);
				updated = true;
			}
		}

		if (updated) {
			await fs.writeFile(filePath, JSON.stringify(bosyuData, null, 2), 'utf8');

			const listStr = currentBosyu.participants.map(id => `<@${id}>`).join(', ') || 'なし';

			const updatedEmbed = EmbedBuilder.from(reaction.message.embeds[0]);
			const fields = updatedEmbed.data.fields.map(f => {
				if (f.name.startsWith('参加者一覧')) {
					return { name: `参加者一覧 (${currentBosyu.participants.length}/${currentBosyu.maxSlots})`, value: listStr, inline: false };
				}
				return f;
			});
			updatedEmbed.setFields(fields);

			await reaction.message.edit({ embeds: [updatedEmbed] });
		}
	} catch (error) {
		console.error('リアクションハンドラーエラー:', error);
	}
}

module.exports = { handleBosyuReaction };