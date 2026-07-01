const { Events, MessageFlags } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const { QUEST_ROLE_IDS } = require('../config.json');

module.exports = {
	name: Events.InteractionCreate,

	async execute(interaction) {
		if (interaction.isCommand()){
			const command = interaction.client.commands.get(interaction.commandName);
			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}
			try {
				await command.execute(interaction);
			} catch (error) {
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({ content: 'このコマンドの実行中にエラーが発生しました', flags: MessageFlags.Ephemeral });
				} else {
					await interaction.reply({ content: 'このコマンドの実行中にエラーが発生しました', flags: MessageFlags.Ephemeral });
				}
			}
		}
		if (interaction.isAutocomplete()) {
			const command = interaction.client.commands.get(interaction.commandName);
			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}	
			try {
				await command.autocomplete(interaction);
			}
			catch (error) {
				console.error(error);
			}
		}
		if (interaction.isModalSubmit() && interaction.customId === 'bosyu_modal') {
			const questType = interaction.fields.getTextInputValue('quest_type');
			const slotRaw = interaction.fields.getTextInputValue('slots');
			const questOption = interaction.fields.getTextInputValue('quest_option');
			const overFlowSetting = interaction.fields.getTextInputValue('allow_overflow') || 'on';
			const mentionRoleInput = interaction.fields.getTextInputValue('mention_role') || 'on';

			const slots = parseInt(slotRaw, 10) || 1;
			const allowOverflow = overFlowSetting.toLowerCase() !== 'off';
			const mentionRole = mentionRoleInput.toLowerCase() !== 'off';

			const filePath = path.join(__dirname, '../commands/json/quest.json');

			try {
				let bosyuData = [];
				try {
					const raw = await fs.readFile(filePath, 'utf8');
					bosyuData = JSON.parse(raw);
				} catch (e) {
					bosyuData = [];
				}

				const roleId = QUEST_ROLE_IDS[questType];
				let mentionPrefix = '';
				if (roleId) {
					mentionPrefix = `<@&${roleId}>`;
				}

				const overflowText = allowOverflow ? '満員でも追加参加を許可する' : '満員後の追加参加は許可しない';
				const authorString = `募集者: <@${interaction.user.id}>`;
				const datailStr = `クエスト名・目的・開催日時: ${questOption}\n募集人数: ${slots}人\n${overflowText}\n${authorString}`;
				const participantsList = '参加者一覧 (0/' + slots + '):\nなし';

				if (mentionRole && mentionPrefix) {
					mentionPrefix = `${mentionPrefix}`;
				} else {
					mentionPrefix = '';
				}
				const message = await interaction.channel.send(`${mentionPrefix}\n【新規クエスト募集】\n\n${datailStr}\n\n${participantsList}`);

				await message.react('✅').catch((error) => {
					console.error('Failed to react to message:', error);
				});
				bosyuData.push({
					messageId: message.id,
					channelId: message.channel.id,
					authorId: interaction.user.id,
					questType: questType,
					questOption: questOption,
					maxSlots: slots,
					allowOverflow: allowOverflow,
					mentionRole: mentionRole,
					participants: [],
				});

				await fs.writeFile(filePath, JSON.stringify(bosyuData, null, 2), 'utf8');
				await interaction.reply({ content: '募集メッセージを送信しました。', flags: MessageFlags.Ephemeral });
			} catch (error) {
				console.error('Error occurred while handling modal submit:', error);
				await interaction.reply({ content: '募集の作成中にエラーが発生しました。', flags: MessageFlags.Ephemeral });
			}
		}
	},
};