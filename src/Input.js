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

    // Lakataan kuuntelemasta stdin-syötettä.
    // Noden pitäisi sulkeutua jahka kaikki skriptit ovat valmistuneet.
    process.stdin.destroySoon();

    // Suljetaan palvelin
    server.close();
  });

  process.stdin.on('data', function (chunk) {
    // Lähetetään data pelaajille
    chunk = chunk.trim();

    log.write('<Server>'.blue + ' %0', chunk);

    server.messages.addToAll({
      msgType: NET.SERVERMSG,
      msgText: chunk
    });
  });
}

exports = module.exports = Input;