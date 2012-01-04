/**
 * @fileOverview Konsoliin kirjoittamiseen liittyvät komennot
 */

/**#nocode+*/
var log = require('./Utils').log
  , NET = require('./Constants').NET
  , colors = require('colors')
  , tty = require('tty')
  , readline = require('readline')
  , splitString = require('./Utils').splitString;
/**#nocode-*/

/**
 * @class Hoitaa konsoliin liittyvät komennot ja toiminnallisuudet.
 *
 * @param {Server} server  NetMatch-palvelin, johon tämä instassi kuuluu
 */
function Input(server) {
  // Konstruktorin sisältöä ei dokumentoida
  /**#nocode+*/

  var self = this
    , rli = readline.createInterface(process.stdin, process.stdout, function (partial) {
      return [server.commands.suggest(partial), partial];
    });

  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.on('SIGINT', function processSIGINT() {
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

  rli.on('line', function rliLine(input){
    msg = input.trim();
    if (!msg) { return; }
    // Käsitellään serverikomennot
    server.commands.call(msg.split(' ')[0], splitString(msg).splice(1));
  });

  // Tästä eteenpäin dokumentoidaan taas jos on jotain dokumentoitavaa
  /**#nocode-*/
}

exports = module.exports = Input;
