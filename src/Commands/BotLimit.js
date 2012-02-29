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
    {name: 'count',  type: 'integer', optional: false, help: 'Amount of bots'}
  ],
  help: 'Sets the count of bots.',
  remote: true,
  action: function commandsBotLimit() {
    var botCount = arguments[1]
    if (botCount >= 0) {
      this.gameState.botCount = botCount;
    } else {
      // Jos annettu arvo oli pienempi kuin nolla niin käytetään kartan asetuksissa määriteltyä
      // arvoa, jos se on olemassa. Muulloin 0
      if (this.gameState.map.config && this.gameState.map.config.botCount > 0) {
        this.gameState.botCount = this.gameState.map.config.botCount;
      } else {
        this.gameState.botCount = 0;
      }
    }
  }
  /**#nocode-*/
};

module.exports = botlimit;