const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const { management_role_id, ownerId, api_token } = require('../../config.json');
const axios = require('axios');
const { URLSearchParams } = require('url');

module.exports = {
	data: new SlashCommandBuilder()
		.setName("edit")
		.setDescription('登録済みの部屋番号を修正')
		.addIntegerOption(option => 
			option.setName('position')
				.setDescription('修正したい部屋の位置（先頭から何番目か。1から指定）')
				.setRequired(true))
		.addIntegerOption(option => 
			option.setName('newroom_number')
				.setDescription('新しい部屋番号')
				.setRequired(true)),

	async execute(interaction) {
		if (!interaction.isCommand()) return;
		await interaction.deferReply({});

		const position = interaction.options.getInteger('position');
		const newRoomNumber = interaction.options.getInteger('newroom_number');

		const filePath = path.join(__dirname, './json/bot-config.json');
		const filePath2 = path.join(__dirname, './json/room.json');

		try {
			if (!interaction.member.roles.cache.has(management_role_id) || !interaction.user.id === ownerId) {
				await interaction.editReply(`権限が付与されていません`);
				return;
			}

			if (newRoomNumber <= 0) {
				await interaction.editReply(`エラー：有効な部屋番号を入力してください。`);
				return;
			}

			let roomsData = [];
			try {
				const data2 = await fs.readFile(filePath2, 'utf8');
				roomsData = JSON.parse(data2).rooms || [];
			} catch (error) {
				roomsData = [];
			}

			if (roomsData.length === 0 || position <= 0 || position > roomsData.length) {
				await interaction.editReply(`エラー：指定された位置（${position}）に部屋が存在しません。現在登録されているのは ${roomsData.length} 部屋です。`);
				return;
			}

			let existingRooms = roomsData.map(r => r.room_number);
			let oldRoomNumber = roomsData[position - 1].room_number;
			
			if (newRoomNumber !== oldRoomNumber && existingRooms.includes(newRoomNumber)) {
				await interaction.editReply(`エラー：新しい部屋番号（${newRoomNumber}）は既に他の枠で登録されています。`);
				return;
			}

			let maxMemberValue = 10;
			try {
				const data = await fs.readFile(filePath, 'utf8');
				const maxMemberConfig = JSON.parse(data);
				maxMemberValue = maxMemberConfig.max_member || 10;
			} catch (error) {
				maxMemberValue = 10;
			}

			if (newRoomNumber > maxMemberValue) {
				await interaction.editReply(`エラー：部屋番号は最大人数(${maxMemberValue})以下でなければなりません。`);
				return;
			}

			roomsData[position - 1].room_number = newRoomNumber;

			let room_number_Array = roomsData.map(room => room.room_number);
			let nexts_room = room_number_Array.slice(1);

			let taiki = [];
			let taiki_member = maxMemberValue - 8;
			let taiki_room = nexts_room.length;

			for (let i = 1; i <= taiki_member; i++) {
				let room = room_number_Array[0] - i;
				if (room <= 0) {
					taiki.push(room + maxMemberValue);
				} else {
					taiki.push(room);
				}
			}

			let taiki_copy = [...taiki];
			let hoji_taiki = new Array(nexts_room.length).fill(null);

			for (let i = 0; i < taiki_room; i++) {
				let targetRoom = nexts_room[i];
				let matchIndex = taiki_copy.indexOf(targetRoom);

				if (matchIndex !== -1) {
					hoji_taiki[i] = taiki_copy[matchIndex];
					taiki_copy.splice(matchIndex, 1);
				}
			}

			for (let i = 0; i < taiki_room; i++) {
				if (hoji_taiki[i] === null) {
					if (taiki_copy.length > 0) {
						let targetRoom = nexts_room[i];
						let targetRoomNext = [];

						for (let j = 1; j <= taiki.length; j++) {
							let room = targetRoom - j;
							if (room <= 0) {
								targetRoomNext.push(room + maxMemberValue);
							} else {
								targetRoomNext.push(room);
							}
						}
						let validIndex = taiki_copy.findIndex(room => !targetRoomNext.includes(room));

						if (validIndex !== -1) {
							hoji_taiki[i] = taiki_copy[validIndex];
							taiki_copy.splice(validIndex, 1);
						} else {
							hoji_taiki[i] = taiki_copy[0] || "なし";
							if (taiki_copy.length > 0) taiki_copy.splice(0, 1);
						}
					} else {
						hoji_taiki[i] = "なし";
					}
				}
			}

			roomsData[0].holder = "処理中";
			for (let i = 0; i < nexts_room.length; i++) {
				roomsData[i + 1].holder = hoji_taiki[i];
			}

			await fs.writeFile(filePath2, JSON.stringify({ rooms: roomsData }, null, 2), 'utf8');

			const editParams = new URLSearchParams();
			editParams.append('action', 'edit');
            editParams.append('position', position.toString());
			editParams.append('room_number', newRoomNumber.toString());
			editParams.append('old_room_number', oldRoomNumber.toString());
			editParams.append('api_key', api_token);

			await axios.post('https://gxf.reiun.com/api.php', editParams, {
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
			}).catch(err => console.error('API修正エラー:', err.message));

			let hoji_taiki_string = "";
			for (let i = 0; i < taiki_room; i++) {
				hoji_taiki_string += `保持する部屋：_**${nexts_room[i]}**_（保持者：_**${hoji_taiki[i]}**_）\n`;
			}

			const webDisplayText = `次に処理する部屋：_**${room_number_Array[0]}**_、待機する番号：_**${taiki.join(', ')}**_\n${hoji_taiki_string}`;

			const statusParams = new URLSearchParams();
			statusParams.append('action', 'update_status');
			statusParams.append('display_text', webDisplayText);
			statusParams.append('api_key', api_token);

			axios.post('https://gxf.reiun.com/api.php', statusParams, {
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
			}).catch(err => console.error('APIステータス更新エラー:', err.message));

			let info_string = "";
			for (let i = 0; i < taiki_room; i++) {
				info_string += `保持する部屋：${nexts_room[i]}（保持者：${hoji_taiki[i]}）\n`;
			}
			if (info_string === "") info_string = "なし";

			const replyText = `部屋番号の修正完了\n${position}番目の部屋を **${oldRoomNumber}** から **${newRoomNumber}** に修正しました。\n\n次に処理する部屋：_**${room_number_Array[0]}**_、待機する番号：_**${taiki.join(', ')}**_\n${hoji_taiki_string}`;

			await interaction.editReply(replyText);

		} catch (error) {
			console.error('editroom内部エラー:', error);
			await interaction.editReply({
				content: `エラーが発生しました。`,
				flags: MessageFlags.SuppressNotifications
			});
		}
	},
};