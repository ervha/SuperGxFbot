const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const {management_role_id} = require('../../config.json');

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
		const filePath = path.join(__dirname, './txt/maxMember.txt');

		const filePath2 = path.join(__dirname, './txt/room.txt')		
		const dir = path.dirname(filePath2, 'utf8');
		await fs.mkdir(dir, { recursive: true });
			
		try {
			if (!content || content <= 0) return;
			
			await fs.appendFile(filePath2, `${content.toString()}\n`, 'utf8');
			const data = await fs.readFile(filePath2, 'utf8')

			let room_number_Array = data.split('\n')
										.map(line => line.trim())
										.filter(line => line !== "")
										.map(Number);

			let nexts_room = room_number_Array.slice(1);

			let maxMemberValue;
			try {
				const data2 = await fs.readFile(filePath, 'utf8');
				maxMemberValue = parseInt(data2.trim(), 10);
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
			let hoji_taiki = [];
			let taiki_lengh = taiki_copy.length;

			for (let i = 0; i < taiki_lengh; i++) {
				if (taiki_copy.length === 0) break;
				if (room_number_Array.includes(taiki_copy[i])) {
					hoji_taiki.push(taiki_copy[i]);
					taiki_copy.splice(i, 1);
				}
			}
			taiki_lengh = taiki_copy.length;
			for (let i = 0; i < taiki_lengh; i++) {
				if (taiki_copy.length === 0) break;
				{
					hoji_taiki.push(taiki_copy[i]);
					taiki_copy.splice(i, 1);
				}
			}

			let hoji_taiki_string = "";
			for (let i = 0; i < room_number_Array.length - 1; i++) {
				hoji_taiki_string += `保持する部屋：_**${nexts_room[i]}（${hoji_taiki[i]}）**_`;
			}

			await interaction.editReply(`${content}の部屋を登録しました\n\n次に処理する部屋：_**${room_number_Array[0]}**_、待機する番号：_**${taiki.join(', ')}**_\n${hoji_taiki_string}`)
        } catch (error) {
            await interaction.editReply({
                content: `エラーが発生しました。`,
                flags: MessageFlags.SuppressNotifications
            });
        }
	},
};