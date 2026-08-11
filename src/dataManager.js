module.exports = {
  async loadAllData() {},
  getUserSetting(userId) { return null; },
  async setUserSetting(userId, data) {},
  getServerSetting(serverId) { return null; },
  async setServerSetting(serverId, data) {},
  getDictionary(serverId) { return []; },
  async addDictionaryWord(serverId, word, reading) {},
  async removeDictionaryWord(serverId, word) {},
  getAutoJoinSetting(serverId) { return null; },
  async setAutoJoinSetting(serverId, channelId) {},
  async removeAutoJoinSetting(serverId) {},
};
