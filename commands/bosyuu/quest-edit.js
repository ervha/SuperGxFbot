const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const { management_role_id, ownerId } = require('../../config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('quest-edit')
		.setDescription('【管理者用】クエスト募集枠の参加状況を編集・管理します')
		.addStringOption(option =>
			option.setName('message_id')
				.setDescription('操作したい募集を選択してください')
				.setRequired(true)
				.setAutocomplete(true))
		.addStringOption(option =>
			option.setName('action_type')
				.setDescription('操作内容')
				.setRequired(true)
				.addChoices(
					{ name: '指定ユーザーの強制追加', value: 'force_add' },
					{ name: '指定ユーザーの強制削除', value: 'force_remove' },
					{ name: '募集の終了（リストから削除）', value: 'close' }
				))
		.addUserOption(option =>
			option.setName('target_user')
				.setDescription('追加・削除対象のユーザー（終了時は不要）')
				.setRequired(false)),

	async autocomplete(interaction) {
		const filePath = path.join(__dirname, '../json/quests.json');
		let bosyuData = [];
		try {
			const raw = await fs.readFile(filePath, 'utf8');
			bosyuData = JSON.parse(raw);
		} catch (e) {
			bosyuData = [];
		}

		const focusedValue = interaction.options.getFocused();
		const choices = bosyuData.map(b => ({
			name: `${b.questOption} - ID: ${b.messageId}`.slice(0, 100),
			value: b.messageId
		}));

		const filtered = choices.filter(choice =>
			choice.name.toLowerCase().includes(focusedValue.toLowerCase())
		).slice(0, 25);

		await interaction.respond(filtered);
	},

	async execute(interaction) {
		if (!interaction.isCommand()) return;
		if (interaction.member.roles.cache.has(management_role_id) || interaction.user.id === ownerId) {
			const targetMsgId = interaction.options.getString('message_id');
			const actionType = interaction.options.getString('action_type');
			const targetUser = interaction.options.getUser('target_user');

			const filePath = path.join(__dirname, '../json/quest.json');

			try {
				let bosyuData = [];
				try {
					const raw = await fs.readFile(filePath, 'utf8');
					bosyuData = JSON.parse(raw);
				} catch (e) {
					bosyuData = [];
				}

				if (interaction.user.id !== bosyuData.find(b => b.messageId === targetMsgId)?.authorId && !interaction.member.roles.cache.has(management_role_id) && interaction.user.id !== ownerId) {
					await interaction.reply({ content: 'この募集を編集する権限がありません。', flags: MessageFlags.SuppressNotifications, flags: MessageFlags.Ephemeral });
					return;
				}

				const index = bosyuData.findIndex(b => b.messageId === targetMsgId);
				if (index === -1) {
					await interaction.reply({ content: '指定された募集が見つかりません。', flags: MessageFlags.SuppressNotifications, flags: MessageFlags.Ephemeral });
					return;
				}

				const currentBosyu = bosyuData[index];

				if (actionType === 'close') {
					bosyuData.splice(index, 1);
					await fs.writeFile(filePath, JSON.stringify(bosyuData, null, 2), 'utf8');

					try {
						const channel = await interaction.client.channels.fetch(currentBosyu.channelId);
						const msg = await channel.messages.fetch(currentBosyu.messageId);
						await msg.edit({ content: `【募集終了】この募集は締め切られました。\n\n${msg.content || ''}` });
					} catch (e) {
						console.error('メッセージ編集失敗:', e.message);
					}

					await interaction.reply({ content: '募集を終了し、管理リストから削除しました（メッセージは残ります）。', flags: MessageFlags.SuppressNotifications, flags: MessageFlags.Ephemeral });
					return;
				}

				if (!targetUser) {
					await interaction.reply({ content: '対象ユーザーを指定してください。', flags: MessageFlags.SuppressNotifications, flags: MessageFlags.Ephemeral });
					return;
				}

				if (actionType === 'force_add') {
					if (currentBosyu.participants.includes(targetUser.id)) {
						await interaction.reply({ content: '既に登録されています。', flags: MessageFlags.SuppressNotifications, flags: MessageFlags.Ephemeral });
						return;
					}
					if (currentBosyu.participants.length >= currentBosyu.maxSlots && !currentBosyu.allowOverflow) {
						await interaction.reply({ content: '満員のため追加できません。', flags: MessageFlags.SuppressNotifications, flags: MessageFlags.Ephemeral });
						return;
					}
					currentBosyu.participants.push(targetUser.id);
				} else if (actionType === 'force_remove') {
					const pIndex = currentBosyu.participants.indexOf(targetUser.id);
					if (pIndex === -1) {
						await interaction.reply({ content: '登録されていません。', flags: MessageFlags.SuppressNotifications, flags: MessageFlags.Ephemeral });
						return;
					}
					currentBosyu.participants.splice(pIndex, 1);
				}

				await fs.writeFile(filePath, JSON.stringify(bosyuData, null, 2), 'utf8');

				try {
					const channel = await interaction.client.channels.fetch(currentBosyu.channelId);
					const msg = await channel.messages.fetch(currentBosyu.messageId);

					const listStr = currentBosyu.participants.map(id => `<@${id}>`).join(', ') || 'なし';
					const contentLines = msg.content.split('\n');

					let updatedContent = '';
					for (let line of contentLines) {
						if (line.startsWith('参加者一覧')) {
							updatedContent += `参加者一覧 (${currentBosyu.participants.length}/${currentBosyu.maxSlots}):\n${listStr}`;
							break;
						}
						updatedContent += line + '\n';
					}

					await msg.edit({ content: updatedContent.trim() });
				} catch (e) {
					console.error('メッセージ更新失敗:', e.message);
				}

				await interaction.reply({ content: '参加者情報を更新しました。', flags: MessageFlags.SuppressNotifications, flags: MessageFlags.Ephemeral });
		
			} catch (error) {
				console.error(error);
				await interaction.reply({ content: '処理中にエラーが発生しました。', flags: MessageFlags.SuppressNotifications, flags: MessageFlags.Ephemeral });
			}
		} else {
			await interaction.reply({ content: '権限が付与されていません。', flags: MessageFlags.SuppressNotifications, flags: MessageFlags.Ephemeral });
		}
	}
};