const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const {management_role_id} = require('../../config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName("tr")
		.setDescription('鳥が出たら実行')
		.addIntegerOption(option => 
			option.setName('tori_room_number')
				.setDescription('鳥が出た部屋の番号')
				.setRequired(true)),

    async execute(interaction){
        if (!interaction.isCommand()) return;
		await interaction.deferReply({ });
		const content = interaction.options.getInteger('tori_room_number');
		const filePath = path.join(__dirname, './maxMember.txt');

		const filePath2 = path.join(__dirname, './room.txt')		
		const dir = path.dirname(filePath2);
		await fs.mkdir(dir, { recursive: true });
			
		try {
			if (!content) return;
			
			await fs.writeFile(filePath2, content.toString(), 'utf8');

			let maxMemberValue;
			try {
				const data = await fs.readFile(filePath, 'utf8');
				maxMemberValue = parseInt(data.trim(), 10);
			} catch (error) {
				maxMemberValue = 10;
			}

			const taiki = [];
			const taiki_room = maxMemberValue - 8;

			for  (let i = 1; i <= taiki_room; i++) {
				let room = content - i;
				if (content - i <= 0) {
					taiki.push(room + maxMemberValue);
				} else {
					taiki.push(room);
				}
			}

			await interaction.editReply(`鳥が出た部屋：${content}、隣接部屋：${taiki.join(', ')}`);
        } catch (error) {
            await interaction.editReply({
                content: `エラーが発生しました。`,
                flags: MessageFlags.SuppressNotifications
            });
        }
	},
};