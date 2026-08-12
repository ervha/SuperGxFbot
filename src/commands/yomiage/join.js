const { SlashCommandBuilder, EmbedBuilder , MessageFlags } = require('discord.js');
const audioPlayer = require('../../core/audioPlayer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('実行者が参加しているボイスチャンネルに接続します'),

  async execute(interaction) {
    if (!interaction.member || !interaction.member.voice || !interaction.member.voice.channel) {
      await interaction.reply({
        content: '最初にボイスチャンネルに参加してから実行してください。',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const voiceChannel = interaction.member.voice.channel;
    const textChannelId = interaction.channelId;

    try {
      audioPlayer.joinChannel(voiceChannel, textChannelId);

      const embed = new EmbedBuilder()
        .setTitle('ボイスチャンネル接続')
        .setDescription(`${voiceChannel.name} に接続しました。このチャンネルのメッセージを読み上げます。`)
        .setColor(0x00AE86);

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error('Failed to join voice channel:', error);
      await interaction.reply({
        content: 'ボイスチャンネルへの接続中にエラーが発生しました。',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
