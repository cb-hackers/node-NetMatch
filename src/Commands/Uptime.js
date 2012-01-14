/**
 * @fileOverview Toteutus komennolle uptime: {@link Commands.uptime}
 */

/**
 * Kertoo kauanko palvelin on ollut päällä.
 * @methodOf Commands
 */
var uptime = {
  /**#nocode+*/
  params: [],
  help: 'Displays how long has the server been running.',
  remote: true,
  action: function commandsUptime() {
    var t = secondsToTime(Math.floor(process.uptime()));
    this.serverMessage('This server has been running for ' + t.d +
      ' days ' + t.h + ' hours ' + t.m + ' minutes and ' + t.s + ' seconds.');
  }
  /**#nocode-*/
};


// http://codeaid.net/javascript/convert-seconds-to-hours-minutes-and-seconds-(javascript) Vähän editoituna
/** @ignore */
function secondsToTime(secs) {
  var days = Math.floor(secs / (60 * 60 * 24))
    , divisor_for_hours = secs % (60 * 60 * 24)
    , hours = Math.floor(divisor_for_hours / (60 * 60))
    , divisor_for_minutes = secs % (60 * 60)
    , minutes = Math.floor(divisor_for_minutes / 60)
    , divisor_for_seconds = divisor_for_minutes % 60
    , seconds = Math.ceil(divisor_for_seconds);
  return {"d": days, "h": hours, "m": minutes, "s": seconds};
}

module.exports = uptime;