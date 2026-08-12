const { Events, MessageFlags, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();
const { QUEST_ROLE_IDS } = process.env;

module.exports = {
	name: Events.InteractionCreate,

	async execute(interaction) {
		if (interaction.isCommand()) {
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

			const filePath = path.join(__dirname, '../../data/quests.json');

			try {
				let questData = [];
				try {
					const raw = await fs.readFile(filePath, 'utf8');
					questData = JSON.parse(raw);
				} catch (e) {
					questData = [];
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

				const embed = new EmbedBuilder()
					.setTitle('【新規クエスト募集】')
					.setDescription(`クエスト種類: ${questType}`)
					.setColor(0x00AE86)
					.addFields(
						{ name: 'クエスト名・目的・開催日時', value: questOption, inline: false },
						{ name: '募集人数', value: `${slots}人`, inline: true },
						{ name: '追加参加設定', value: overflowText, inline: false },
						{ name: '募集者', value: `<@${interaction.user.id}>`, inline: false },
						{ name: `参加者一覧 (0/${slots})`, value: 'なし', inline: false }
					)
					.setTimestamp();

				const message = await interaction.channel.send({
					content: mentionPrefix ? `${mentionPrefix}` : null,
					embeds: [embed]
				});

				await message.react('✅').catch((error) => {
					console.error('Failed to react to message:', error);
				});
				questData.push({
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

				await fs.writeFile(filePath, JSON.stringify(questData, null, 2), 'utf8');
				await interaction.reply({ content: '募集メッセージを送信しました。', flags: MessageFlags.Ephemeral });
			} catch (error) {
				console.error('Error occurred while handling modal submit:', error);
				await interaction.reply({ content: '募集の作成中にエラーが発生しました。', flags: MessageFlags.Ephemeral });
			}
		}
	},
};