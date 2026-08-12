const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('ボットのすべてのコマンド（ルーム管理・読み上げなど）の一覧と説明を表示します。'),

  async execute(interaction) {
    const commands = interaction.client.commands;
    
    // コマンド一覧を取得して、カテゴリ（大まかな機能）ごとに分けることも可能ですが、
    // まずは全てのコマンドをアルファベット順に綺麗にリストアップします。
    const commandList = Array.from(commands.values()).sort((a, b) => 
      a.data.name.localeCompare(b.data.name)
    );

    const embed = new EmbedBuilder()
      .setTitle('📚 コマンドヘルプ一覧')
      .setDescription('現在利用可能なすべてのコマンドの一覧です。')
      .setColor(0x3498db);

    let helpText = '';
    
    commandList.forEach((cmd) => {
      helpText += `**/${cmd.data.name}**\n${cmd.data.description || '説明なし'}\n\n`;
    });

    // EmbedのDescriptionは最大4096文字なので、念のため長さをチェック
    if (helpText.length > 4000) {
        helpText = helpText.substring(0, 4000) + '... (長すぎるため省略されました)';
    }

    embed.addFields({ name: 'コマンド一覧', value: helpText });

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });
  },
};
