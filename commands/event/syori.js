const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const {management_role_id, owner_role_id} = require('../../config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName("syori")
		.setDescription('鳥を処理したら実行'),

    async execute(interaction){
        if (!interaction.isCommand()) return;
		await interaction.deferReply({ });
		const filePath = path.join(__dirname, './txt/maxMember.txt');
		const filePath2 = path.join(__dirname, './txt/room.txt')		
			
		try {
			if (interaction.member.roles.cache.has(management_role_id) || interaction.member.roles.cache.has(owner_role_id)) {
				try {
					const data2 = await fs.readFile(filePath2, 'utf8')
					const lines = data2.split('\n').filter(Boolean);
					lines.shift();
					await fs.writeFile(filePath2, lines.join('\n') + '\n', 'utf8');

					const data3 = await fs.readFile(filePath2, 'utf8')

					let room_number_Array = data3.split('\n')
										.map(line => line.trim())
										.filter(line => line !== "")
										.map(Number);

					let nexts_room = room_number_Array.slice(1);
					
					let maxMemberValue;
					try {
						const data = await fs.readFile(filePath, 'utf8');
						maxMemberValue = parseInt(data.trim(), 10);
					} catch (error) {
						maxMemberValue = 10;
					}

					let taiki = [];
					let taiki_room = maxMemberValue - 8;

					for  (let i = 1; i <= taiki_room; i++) {
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
								hoji_taiki[i] = taiki_copy[0];
								taiki_copy.splice(0, 1);
							} else {
								hoji_taiki[i] = "なし";
							}
						}
					}

					let hoji_taiki_string = "";
					for (let i = 0; i < nexts_room.length; i++) {
						hoji_taiki_string += `保持する部屋：_**${nexts_room[i]}（保持者：${hoji_taiki[i]}）**_\n`;
					}

					if (!(room_number_Array[0] == undefined)) {
						await interaction.editReply(`部屋の処理を確認しました\n\n次に処理する部屋：_**${room_number_Array[0]}**_、待機する番号：_**${taiki.join(', ')}**_\n${hoji_taiki_string}`)
					} else {
						await interaction.editReply(`部屋の処理を確認しました\n処理待ちの部屋はありません`)
					}
				} catch (err) {
					await interaction.editReply('部屋の処理中にエラーが発生しました')
				}
			} else {
				await interaction.editReply(`権限が付与されていません`)
			}			
        } catch (error) {
            await interaction.editReply({
                content: `エラーが発生しました。`,
                flags: MessageFlags.SuppressNotifications
            });
        }
	},
};