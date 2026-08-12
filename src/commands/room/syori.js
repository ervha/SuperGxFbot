const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();
const { management_role_id, ownerId, api_token } = process.env;
const axios = require('axios');
const { URLSearchParams } = require('url');
const audioPlayer = require('../../core/audioPlayer');
const roomMutex = require('../../core/roomLock');

module.exports = {
	data: new SlashCommandBuilder()
		.setName("syori")
		.setDescription('鳥を処理したら実行'),

	async execute(interaction) {
		if (!interaction.isCommand()) return;
		await interaction.deferReply({});
		const config_filePath = path.join(__dirname, '../../../data/bot-config.json');
		const rooms_filePath = path.join(__dirname, '../../../data/room.json');

		await roomMutex.lock();
		try {
			if (interaction.member.roles.cache.has(management_role_id) || interaction.user.id === ownerId) {
				try {

					let roomsData = [];
					try {
						const data2 = await fs.readFile(rooms_filePath, 'utf8');
						roomsData = JSON.parse(data2).rooms || [];
					} catch (error) {
						roomsData = [];
					}

					let removedRoom = null;
					if (roomsData.length > 0) {
						const firstroom = roomsData.shift();
						removedRoom = firstroom.room_number;
					}

					if (removedRoom) {
						const delParams = new URLSearchParams();
						delParams.append('action', 'delete');
						delParams.append('room_number', removedRoom.toString());
						delParams.append('api_key', api_token);

						axios.post('https://gxf.reiun.com/api.php', delParams, {
							headers: {
								'Content-Type': 'application/x-www-form-urlencoded',
								'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
							}
						}).catch(err => console.error('API削除エラー:', err.message));
					}

					if (roomsData.length === 0) {
						const clearParams = new URLSearchParams();
						clearParams.append('action', 'update_all');
						clearParams.append('api_key', api_token);

						axios.post('https://gxf.reiun.com/api.php', clearParams, {
							headers: {
								'Content-Type': 'application/x-www-form-urlencoded',
								'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
							}
						}).catch(err => console.error(err));

						const statusParams = new URLSearchParams();
						statusParams.append('action', 'update_status'); // 新しいアクション名
						statusParams.append('display_text', '処理待ちの部屋はありません');
						statusParams.append('api_key', api_token);

						axios.post('https://gxf.reiun.com/api.php', statusParams, {
							headers: {
								'Content-Type': 'application/x-www-form-urlencoded',
								'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
							}
						}).catch(err => console.error('APIステータス更新エラー:', err.message));

						if (interaction.guildId) {
							audioPlayer.playChime(interaction.guildId);
						}

						await interaction.editReply(`部屋の処理を確認しました\n処理待ちの部屋はありません`);
						await fs.writeFile(rooms_filePath, JSON.stringify({ rooms: roomsData }, null, 2), 'utf8');
						return;
					}

					let maxMemberValue = 10;
					try {
						const data = await fs.readFile(config_filePath, 'utf8');
						maxMemberValue = JSON.parse(data).max_member;
					} catch (error) {
						maxMemberValue = 10;
					}

					let room_number_Array = roomsData.map(room => room.room_number);

					let nexts_room = room_number_Array.slice(1);

					let taiki = [];
					let taiki_room = maxMemberValue - 8;

					for (let i = 1; i <= taiki_room; i++) {
						let room = room_number_Array[0] - i;
						if (room_number_Array[0] - i <= 0) {
							taiki.push(room + maxMemberValue);
						} else {
							taiki.push(room);
						}
					}

					let taiki_copy = [...taiki];
					let hoji_taiki = new Array(nexts_room.length).fill(null);

					for (let i = 0; i < nexts_room.length; i++) {
						let targetRoom = nexts_room[i];
						let matchIndex = taiki_copy.indexOf(targetRoom);

						if (matchIndex !== -1) {
							hoji_taiki[i] = taiki_copy[matchIndex];
							taiki_copy.splice(matchIndex, 1);
						}
					}

					for (let i = 0; i < nexts_room.length; i++) {
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
					for (let i = 0; i < nexts_room.length; i++) {
						hoji_taiki_string += `保持する部屋：_**${nexts_room[i]}（保持者：${hoji_taiki[i]}）**_\n`;
					}

					const webDisplayText = `次に処理する部屋：_**${room_number_Array[0]}**_、待機する番号：_**${taiki.join(', ')}**_\n${hoji_taiki_string}`;

					const statusParams = new URLSearchParams();
					statusParams.append('action', 'update_status'); // 新しいアクション名
					statusParams.append('display_text', webDisplayText);
					statusParams.append('api_key', api_token);

					axios.post('https://gxf.reiun.com/api.php', statusParams, {
						headers: {
							'Content-Type': 'application/x-www-form-urlencoded',
							'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
						}
					}).catch(err => console.error('APIステータス更新エラー:', err.message));

					if (interaction.guildId) {
						audioPlayer.playChime(interaction.guildId);
					}

					await interaction.editReply(`部屋の処理を確認しました\n\n次に処理する部屋：_**${room_number_Array[0]}**_、待機する番号：_**${taiki.join(', ')}**_\n${hoji_taiki_string}`);
				} catch (err) {
					console.error(err);
					await interaction.editReply('部屋の処理中にエラーが発生しました');
				}
			} else {
				await interaction.editReply(`権限が付与されていません`);
			}
		} catch (error) {
			console.error(error);
			await interaction.editReply({
				content: `エラーが発生しました。`,
				flags: MessageFlags.SuppressNotifications
			});
		} finally {
			roomMutex.unlock();
		}
	},
};
