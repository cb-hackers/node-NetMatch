var log = require('../Utils').log;

/**
 * Tekee pelaajasta adminin.
 * @param {player} who  Kenet opataan
 */
module.exports = {
  params: [
    {name: 'who',  type: 'player', optional: false, help: 'Player who to op'}
  ],
  help: 'Makes a player admin. Like server-side login.',
  remote: true,
  action: function commandsOp() {
    var server = this
      , clr = arguments[0]
      , player = this.getPlayer(arguments[1])
      // Vastaa konsoliin tai pelaajalle, jos ilmenee ongelmia.
      , reply = function (s) {
        if (clr) { server.serverMessage(s, clr.playerId); }
        else     { log.warn(s); }
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
    this.serverMessage('You are now an admin!', player.playerId);
    // Kerrotaan kutsujalle myös
    if (clr) { this.serverMessage('Done! :)', clr.playerId); }
  }
};