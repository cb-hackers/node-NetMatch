/**
 * @fileOverview Toteutus komennolle botlimit: {@link Commands.botlimit}
 */

"use strict";

/**
 * Kertoo kauanko palvelin on ollut päällä.
 * @methodOf Commands
 */
var botlimit = {
  /**#nocode+*/
  params: [
    {name: 'count',  type: 'integer', optional: true, help: 'When this amount of players is reached, bots start to leave'}
  ],
  help: 'Sets the bot depart limit',
  remote: true,
  action: function commandsBotLimit() {
    var msg, value;
    // Jos ei annettu parametreja, niin tulostetaan nykyinen bottilimitti. arguments[0] on kutsuja
    if (arguments.length < 2) {
      msg = 'Current bot depart limit is ' + this.gameState.botDepartLimit + ' and current bot count is ' + this.gameState.botCount;
      if (arguments[0]) {
        this.serverMessage(msg, arguments[0]);
      } else {
        console.log(msg);
      }
      return;
    }
    value = arguments[1]
    if (value >= 0) {
      this.gameState.botDepartLimit = value;
    } else {
      // Jos annettu arvo oli pienempi kuin nolla niin käytetään kartan asetuksissa määriteltyä
      // arvoa, jos se on olemassa. Muulloin 0
      if (this.gameState.map.config && this.gameState.map.config.botDepartLimit > 0) {
        this.gameState.botDepartLimit = this.gameState.map.config.botDepartLimit;
      } else {
        this.gameState.botDepartLimit = 0;
      }
    }
  }
  /**#nocode-*/
};

module.exports = botlimit;