const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const { management_role_id, ownerId } = require('../../.env');

module.exports = {
	data: new SlashCommandBuilder()
		.setName("nowroom")
		.setDescription('現在処理中の部屋を表示'),

	async execute(interaction) {
		if (!interaction.isCommand()) return;
		await interaction.deferReply({});
		const config_filePath = path.join(__dirname, '../json/bot-config.json');
		const rooms_filePath = path.join(__dirname, '../json/room.json')

		try {
			try {
				let roomsData = [];
				try {
					const data2 = await fs.readFile(rooms_filePath, 'utf8');
					roomsData = JSON.parse(data2).rooms || [];
				} catch (error) {
					roomsData = [];
				}

				if (roomsData.length === 0) {
					await interaction.editReply(`現在処理中の部屋はありません`);
					return;
				}

				let currentroom = roomsData[0];
				let nexts_room = roomsData.slice(1);

				let maxMemberValue = 10;
				try {
					const data = await fs.readFile(config_filePath, 'utf8');
					maxMemberValue = JSON.parse(data).max_member || 10;
				} catch (error) {
					maxMemberValue = 10;
				}

				let taiki = [];
				let taiki_room = maxMemberValue - 8;

				for (let i = 1; i <= taiki_room; i++) {
					let room = currentroom.room_number - i;
					if (room <= 0) {
						taiki.push(room + maxMemberValue);
					} else {
						taiki.push(room);
					}
				}

				let hoji_taiki_string = "";
				for (let i = 0; i < nexts_room.length; i++) {
					hoji_taiki_string += `保持する部屋：_**${nexts_room[i].room_number}（保持者：${nexts_room[i].holder || "なし"}）**_\n`;
				}
				await interaction.editReply(`次に処理する部屋：_**${currentroom.room_number}**_、待機する番号：_**${taiki.join(', ')}**_\n${hoji_taiki_string}`)

			} catch (err) {
				await interaction.editReply('部屋の確認中にエラーが発生しました')
			}
		} catch (error) {
			await interaction.editReply({
				content: `エラーが発生しました。`,
				flags: MessageFlags.SuppressNotifications
			});
		}
	},
};
