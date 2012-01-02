/**
 * Kertoo kauanko palvelin on ollut päällä.
 */
module.exports = {
  params: [],
  help: 'Displays how long has the server been running.',
  remote: true,
  action: function commandsUptime() {
    var t = secondsToTime(Math.floor(process.uptime()));
    this.serverMessage('This server has been running for ' + t.d + 
      ' days ' + t.h + ' hours ' + t.m + ' minutes and ' + t.s + ' seconds.');
  }
};