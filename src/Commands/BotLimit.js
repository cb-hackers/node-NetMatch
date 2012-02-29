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
    this.gameState.botCount = arguments[1];
  }
  /**#nocode-*/
};

module.exports = botlimit;