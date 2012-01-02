/**
 * @fileOverview Konsoliin kirjoittamiseen liittyvät komennot
 */

/**#nocode+*/
var log = require('./Utils').log
  , NET = require('./Constants').NET
  , colors = require('colors')
  , tty = require('tty')
  , readline = require('readline');
/**#nocode-*/

function Input(server) {
  var self = this
    , rli = readline.createInterface(process.stdin, process.stdout, function (partial) {
      return [server.commands.suggest(partial), partial];
    });

  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.on('SIGINT', function () {
    log.notice('Received ' + 'SIGINT'.red);
    // Lakataan kuuntelemasta stdin-syötettä.
    // Node sulkeutuu jahka kaikki eventit on kutsuttu, eikä uusia ole lisätty event-luuppiin.
    process.stdin.destroy();
    server.close();
  });

  rli.on('close', function rliClose() {
    process.stdin.destroy();
    server.close();
  });

  rli.on('line', function(input){
    msg = input.trim();
    if (!msg) { return; }
    // Käsitellään serverikomennot
    server.commands.call(msg.split(' ')[0], msg.split(' ').splice(1));
  });
}

exports = module.exports = Input;
