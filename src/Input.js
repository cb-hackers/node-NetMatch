/**
 * @fileOverview Konsoliin kirjoittamiseen liittyvät komennot
 */

/**#nocode+*/
var log = require('./Utils').log
  , NET = require('./Constants').NET
  , colors = require('colors');
/**#nocode-*/

function Input(server) {
  this.server = server;

  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.on('SIGINT', function () {
    // Suljetaan palvelin kun tulee SIGINT
    console.log();
    log.warn('Received SIGINT');
    server.close();
  });

  server.on('closed', function () {
    // Nyt ollaan suljettu, voidaan sulkea koko prosessi. Mutta odotetaan toki puoli sekuntia,
    // että muut funktiot jotka kuuntelevat closed-eventtiä voisivat toimia.
    process.stdin.destroySoon();
  });


  process.stdin.on('data', function (chunk) {
    // Lähetetään data pelaajille
    chunk = chunk.trim();

    log.write('<Server>'.blue + ' %0', chunk);

    var msgData = {
      msgType: NET.SERVERMSG,
      msgText: chunk
    };

    var playerIds = Object.keys(server.players);
    for (var i = playerIds.length; i--;) {
      var plr = server.players[playerIds[i]];
      if (plr.active && !plr.zombie) {
        server.messages.add(plr.playerId, msgData);
      }
    }
  });
}

exports = module.exports = Input;