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
      // Luodaan automaattinen täydennys komentojen nimien perusteella
      var suggestions = [], prefix = '';
      // Jos rivi alkaa help komennolla
      if (partial.substr(0, 5) === 'help ') {
        // Poistetaan help alusta, jotta täydennys toimii myös helpin komentoparametrissä. :)
        partial = partial.slice(5);
        // Lisätään prefiksi, jotta help ei kuitenkaan katoa komennon alusta
        prefix = 'help ';
      }

      // TODO: Lisää automaattinen täydennys tyypin perusteella esim. pelaajan nikki tai komento.

      // Käydään kaikki komennot läpi
      for (var i = server.commands.commands.length; i--;) {
        var c = server.commands.commands[i];
        // Käydään kaikki aliakset läpi
        for (var j = c.aliases.length; j--;) {
          if (c.aliases[j].substr(0, partial.length) === partial) {
            // Tämä voisi olla vaihtoehto
            suggestions.push(prefix + c.aliases[j]);
          }
        }
      }
      return [suggestions, prefix + partial];
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
