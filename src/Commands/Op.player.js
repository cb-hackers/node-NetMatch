/**
 * @fileOverview Toteutus komennolle op: {@link Commands.op}
 */

var log = require('../Utils').log;

/**
 * Tekee pelaajasta adminin.
 * @methodOf Commands
 *
 * @param {player} who  Kenet opataan
 */
var op = {
  /**#nocode+*/
  params: [
    {name: 'who',  type: 'player', optional: false, help: 'Player who to op'}
  ],
  help: 'Makes a player admin. Like server-side login.',
  remote: true,
  action: function commandsOp() {
    var server = this
      , caller = arguments[0]
      , player = this.getPlayer(arguments[1])
      // Vastaa konsoliin tai pelaajalle, jos ilmenee ongelmia.
      , reply = function (s) {
        if (caller) { server.serverMessage(s, caller); }
        else        { log.warn(s); }
      };

    if (!player) {
      reply('Couldn\'t find player!');
      return;
    }

    if (player.admin) {
      reply(player.name + ' is already an admin!');
      return;
    }

    player.admin = true;
    this.serverMessage('You are now an admin!', player);
    // Kerrotaan kutsujalle myös
    if (caller) { this.serverMessage('Done! :)', caller); }
  }
  /**#nocode-*/
};

module.exports = op;
