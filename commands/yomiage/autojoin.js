const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const dataManager = require('../../src/dataManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autojoin')
    .setDescription('自動接続チャンネルの設定・解除を操作します'),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'サーバー内で実行してください。', ephemeral: true });
      return;
    }

    const guildId = interaction.guildId;
    const userVoiceChannel = interaction.member && interaction.member.voice ? interaction.member.voice.channel : null;

    const buildComponents = (currentAutoJoinChannelId) => {
      const row = new ActionRowBuilder();

      if (userVoiceChannel) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('set_autojoin_vc')
            .setLabel(`${userVoiceChannel.name} を自動接続先に登録`)
            .setStyle(ButtonStyle.Primary)
        );
      }

      if (currentAutoJoinChannelId) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('remove_autojoin_vc')
            .setLabel('自動接続設定を解除')
            .setStyle(ButtonStyle.Danger)
        );
      }

      return row.components.length > 0 ? [row] : [];
    };

    const buildEmbed = (currentAutoJoinChannelId) => {
      let channelInfo = '未設定';
      if (currentAutoJoinChannelId) {
        const channel = interaction.guild.channels.cache.get(currentAutoJoinChannelId);
        channelInfo = channel ? channel.name : `チャンネルID: ${currentAutoJoinChannelId}`;
      }

      let guide = '下のボタンを押して、自動接続の設定・解除を行ってください。';
      if (!userVoiceChannel && !currentAutoJoinChannelId) {
        guide = 'ボイスチャンネルに参加した状態で実行すると、そのチャンネルを自動接続先に設定できます。';
      }

      return new EmbedBuilder()
        .setTitle('自動接続設定パネル')
        .setDescription(`現在の自動接続チャンネル: ${channelInfo}\n\n${guide}`)
        .setColor(0x34495E);
    };

    let currentAutoJoinChannelId = dataManager.getAutoJoinSetting(guildId);

    const response = await interaction.reply({
      embeds: [buildEmbed(currentAutoJoinChannelId)],
      components: buildComponents(currentAutoJoinChannelId),
      ephemeral: true,
    });

    const collector = response.createMessageComponentCollector({
      time: 60000,
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({ content: '他のユーザーの操作パネルです。', ephemeral: true });
        return;
      }

      if (i.customId === 'set_autojoin_vc' && userVoiceChannel) {
        await dataManager.setAutoJoinSetting(guildId, userVoiceChannel.id);
      } else if (i.customId === 'remove_autojoin_vc') {
        await dataManager.removeAutoJoinSetting(guildId);
      }

      currentAutoJoinChannelId = dataManager.getAutoJoinSetting(guildId);

      await i.update({
        embeds: [buildEmbed(currentAutoJoinChannelId)],
        components: buildComponents(currentAutoJoinChannelId),
      });
    });
  },
};
