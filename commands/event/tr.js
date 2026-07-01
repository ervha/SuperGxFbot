const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const {management_role_id, ownerId, api_token} = require('../../config.json');
const axios = require('axios');
const { URLSearchParams } = require('url');

module.exports = {
	data: new SlashCommandBuilder()
		.setName("tr")
		.setDescription('鳥が出たら実行')
		.addIntegerOption(option => 
			option.setName('room_number')
				.setDescription('鳥が出た部屋の番号')
				.setRequired(true)),

    async execute(interaction){
        if (!interaction.isCommand()) return;
		await interaction.deferReply({ });
		const content = interaction.options.getInteger('room_number');
		const config_filePath = path.join(__dirname, '../json/bot-config.json');
		const rooms_filePath = path.join(__dirname, '../json/room.json');
		const dir = path.dirname(rooms_filePath);
		await fs.mkdir(dir, { recursive: true });
			
		try {
			if (!content || content <= 0) { 
				await interaction.editReply({
					content: `エラー：有効な部屋番号を入力してください。${content}は無効です。`,
					flags: MessageFlags.SuppressNotifications
				});
				return;
			}

			let addroom = content;

			let maxMemberValue = 10;
			try {
				const data2 = await fs.readFile(config_filePath, 'utf8');
				maxMemberValue = JSON.parse(data2).max_member;
			} catch (error) {
				maxMemberValue = 10;
			}

			if (maxMemberValue < content) {
				await interaction.editReply({
					content: `エラー：部屋番号は最大人数(${maxMemberValue})以下でなければなりません。${content}は無効です。`,
					flags: MessageFlags.SuppressNotifications
				});
				return;
			}

			let roomsData = [];
			try {
				const data_Check = await fs.readFile(rooms_filePath, 'utf8');
				roomsData = JSON.parse(data_Check).rooms || [];
			} catch (error) {
				roomsData = [];
			}
			let maxMemberValue_Check = roomsData.map(room => room.room_number);

			if (maxMemberValue_Check.includes(content)) {
				await interaction.editReply({
					content: `エラー：その部屋番号は既に追加されています。${content}は無効です。`,
					flags: MessageFlags.SuppressNotifications
				});
				return;
			}

			roomsData.push({ room_number: content , holder: "なし" });
			let room_number_Array = roomsData.map(room => room.room_number);

			let nexts_room = room_number_Array.slice(1);

			let taiki = [];
			let taiki_member = maxMemberValue - 8;
			let taiki_room = nexts_room.length;

			for  (let i = 1; i <= taiki_member; i++) {
				let room = room_number_Array[0] - i;
				if (room_number_Array[0] - i <= 0) {
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
							hoji_taiki[i] = taiki_copy[0];
							taiki_copy.splice(0, 1);
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

			await fs.writeFile(rooms_filePath, JSON.stringify({ rooms: roomsData }, null, 2), 'utf8');

			let hoji_taiki_string = "";
			for (let i = 0; i < taiki_room; i++) {
				hoji_taiki_string += `保持する部屋：_**${nexts_room[i]}（保持者：${hoji_taiki[i]}）**_\n`;
			}

			const webDisplayText = `次に処理する部屋：_**${room_number_Array[0]}**_、待機する番号：_**${taiki.join(', ')}**_\n${hoji_taiki_string}`;

			const params = new URLSearchParams();
			params.append('action', 'add');
			params.append('room_number', addroom.toString());
			params.append('api_key', api_token);

			axios.post('https://gxf.reiun.com/api.php', params, {
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
			}).catch(err => console.error('API追加エラー:', err.message));

			const statusParams = new URLSearchParams();
			statusParams.append('action', 'update_status'); // 新しいアクション名
			statusParams.append('display_text', webDisplayText);
			statusParams.append('api_key', api_token);

			axios.post('https://gxf.reiun.com/api.php', statusParams, {
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
			}).catch(err => console.error('APIステータス更新エラー:', err.message));

			await interaction.editReply(`${addroom}の部屋を登録しました\n\n次に処理する部屋：_**${room_number_Array[0]}**_、待機する番号：_**${taiki.join(', ')}**_\n${hoji_taiki_string}`);
        } catch (error) {
			console.error(error);
            await interaction.editReply({
                content: `エラーが発生しました。`,
                flags: MessageFlags.SuppressNotifications
            });
        }
	},
};
