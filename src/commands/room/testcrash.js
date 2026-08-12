const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName("testcrash")
		.setDescription('開発用：セーフティネットのテストエラーを発生させます'),
	async execute(interaction) {
		await interaction.reply({ content: '3秒後に意図的な非同期エラー（Unhandled Rejection）を発生させます。管理者宛にDMが届くか確認してください。', ephemeral: true });
        
        // 3秒後に、catchされないPromiseエラーを発生させる
		setTimeout(() => {
            new Promise((resolve, reject) => {
                reject(new Error("これはテスト用の意図的なエラー（TestCrash）です！セーフティネットが正常に機能しています。"));
            });
        }, 3000);
	},
};
