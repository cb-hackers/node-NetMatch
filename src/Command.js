/**
 * @fileOverview Serverikomentoihin liittyvät toiminnot
 */

/**#nocode+*/
var log  = require('./Utils').log
  , join = require('./Utils').join
  , NET = require('./Constants').NET;

/**#nocode-*/

/**
 * @private
 * @namespace Sisältää serverikomennot, joihin pääsee käsiksi {@link Command}-luokan call-metodilla.
 *
 * Komennot muodostuvat seuraavasti:
 * @property {Object[]} params  Parametrit listassa. Jokaisella parametrilla on seuraavat kentät:<br>
 *                                - {String} name: Parametrin nimi<br>
 *                                - {String} type: Parametrin tyyppi (esim. string tai player) käytetään täydennyksessä<br>
 *                                - {Boolean} optional: Voiko parametrin jättää antamatta<br>
 *                                - {String} help: Parametrin ohje, mitä tämä parametri tekee
 * @property {String}   help    Mihin komentoa käytetään
 * @property {Boolean}  remote  Voiko komentoa kutsua klientillä
 * @property {Function} action  Komennon logiikka
 * @property {Array}    [sub]   Lista alikomentojen nimistä, jos niitä on.
 *                              Esim config get/set/save -> sub: ['get', 'set', 'save']
 *                              Tätä käytetään täydennyksessä.
 */
var Commands = {};

// Sisäänrakennetut komennot

/**
 * Help-komento tulostaa tietoja halutusta komennosta.
 * @param {String} [command]  Minkä komennot salat paljastetaan
 */
Commands.help = {
  params: [
    {name: 'command', type: 'command', optional: true, help: 'Which command\'s help to show'}
  ],
  help: 'Shows help about this server\'s commands. See ´commands´ for list of available commands.',
  remote: true,
  action: function commandsHelp() {
    var server = this,
      command = arguments[1] || 'help';
    if (arguments[0]) {
      this.commands.getHelpString(command).split('\n').forEach(function (m) {
        server.serverMessage(m, arguments[0].playerId);
      });
    } else {
      console.log(this.commands.getHelpString(command, true));
    }
  }
};

/**
 * Listaa kaikki komennot.
 * @param {Boolean} [verbose]  Tulostetaanko samalla helpit.
 */
Commands.commands = {
  params: [
    {name: 'verbose', type: 'boolean', optional: true, help: 'Spam a lot. Only serverside'}
  ],
  help: 'Lists available commands.',
  remote: true,
  action: function commandsCommands() {
    var server = this;
    if (!arguments[1]) {
      if (arguments[0]) {
        this.serverMessage('Commands: ' + Object.keys(Commands).join(', '), arguments[0].playerId);
      } else {
        console.log('Commands: '.green + Object.keys(Commands).join(', '));
      }
    } else { // Verbose
      Object.keys(Commands).map(function (i) {
        console.log(i.toUpperCase().green);
        console.log(server.commands.getHelpString(i, true));
      });
    }
  }
};

/**
 * Lähettää NET.SERVERMSG paketin klienteille.
 * @param {String} [message]  Viesti, joka lähetetään
 */
Commands.say = {
  params: [
    {name: 'message', type: 'string', optional: false, help: 'Message to send to all players'},
  ],
  help: 'Sends a server message to all players.',
  remote: false,
  action: function commandsSay() {
    var msg = Array.prototype.slice.call(arguments, 1).join(' ');
    this.serverMessage(msg);
  }
};

/** Sulkee palvelimen. */
Commands.close = {
  params: [],
  help: 'Closes the server.',
  remote: true,
  action: function commandsClose() {
    this.close();
  }
};

/** Listaa paikalla olevat pelaajat. */
Commands.list = {
  params: [],
  help: 'Lists all connected players.',
  remote: false,
  action: function commandsList() {
    var plr, plrs = [], playerIds = Object.keys(this.players);
    for (var i = playerIds.length; i--;) {
      plr = this.players[playerIds[i]];
      if (plr.active) { plrs.push(plr.name); }
    }
    log.info('%0 player(s) connected: %1', plrs.length, plrs.join(', '));
  }
};

/**
 * Heittää pelaajan pellolle
 * @param {Player} who     Pelaaja, joka potkaistaan. Nimi tai ID kelpaa
 * @param {String} reason  Selitys tälle hirmuteolle
 */
Commands.kick = {
  params: [
    {name: 'who',    type: 'player', optional: false, help: 'Player who needs to be kicked'},
    {name: 'reason', type: 'string', optional: true,  help: 'Message to display for the kicked player'}
  ],
  help: 'Removes the player from the server.',
  remote: true,
  action: function commandsKick() {
    var player
      , plrName = arguments[1]
      , reason  = arguments[2] || '';

    // Jos annettiinkin ID, niin vaihdetaan se nimeksi
    if (this.players[plrName]) {
      plrName = this.players[plrName].name;
    }

    player = this.getPlayer(plrName);
    if (!player || !player.active || player.zombie) {
      log.notice('Sorry, player couldn\'t be found or you tried to kick a bot.');
    } else {
      // Vaihdetaan toinen parametri nollaksi, jos kutsut tulee palvelimelta, kun klientti on pätsätty, muuten MAV.
      this.kickPlayer(player.playerId, // Kicker id joko komennon kutsujan ID tai serveri.
        arguments[0] && arguments[0].playerId || 0, reason);
    }

  }
};

/**
 * Kirjaa pelaajan sisään adminiksi.
 * @param {Player} who    Pelaaja, joka kirjautuu
 * @param {String} pass   Salasana
 */
Commands.login = {
  params: [
    {name: 'pass', type: 'string',  optional: false, help: 'Password'}
  ],
  help: 'Logs a player in.',
  remote: true,
  action: function commandsLogin() {
    var player = arguments[0]
      , pass   = arguments[1];
    if (!player) {
      log.warn('Couldn\'t find player!');
      return;
    }
    if (player.admin) {
      this.serverMessage('You are already an admin!', player.playerId);
      return;
    }
    if (pass === this.config.password) {
      player.admin = true;
      this.serverMessage('You are now an admin!', player.playerId);
    } else {
      log.warn('Incorrect password!');
    }
  }
};

/**#nocode+*/
// Ladataan lisää komentoja Commands-kansiosta, jos semmoisia löytyy.
(function () { // Ei vuodeta muuttujia
  var fs = require('fs')
  , path = require('path')
  , files = fs.readdirSync(__dirname + '/Commands')
  , cmds = files
    // Filtteröi ei-js-filut.
    .filter(function (fn) { return path.extname(fn) === '.js'; })
    // Kartoita loput
    .map(function loadCommands(fn) {
      // Komennon nimi on filun ensimmäinen osa esim. asd.lol.js -> asd
      var cmd = fn.toLowerCase().split('.')[0];
      try {
        Commands[cmd] = require(__dirname + '/Commands/' + fn);
        return cmd.green;
      } catch (e) {
        log.error('Failed to load module "%0". See --debug (-d) for stack trace.', cmd.red);
        log.debug(e.stack);
        return cmd.red;
      }
    });
  log.info('Found %0 command-module(s): %1',
    String(cmds.length).magenta, cmds.join(', '));
}());
/**#nocode-*/


/**
 * Hoitaa komentojen sisäisen käsittelyn.
 * @class Komentojen käsittely
 *
 * @param {Server} server  NetMatch-palvelin, johon tämä instanssi kuuluu
 */
function Command(server) {
  this.server = server;
}

/**
 * Kutstuu haluttua komentoa halutuilla parametreillä. Komentojen konteksti (this) on aina serveri.
 * @param {String} name      Mitä komentoa kutsutaan
 * @param {Array}  [args]    Millä parametreillä kutsutaan
 * @param {Player} [player]  Kuka kutsui komentoa (undefined mikäli konsolista)
 */
Command.prototype.call = function (name, args, player) {
  var c = Commands[name], p;
  if (!c) { log.error('Command "%0" not recognized. You need ´help´.', name.yellow); return; }

  // Tarkistetaan sallitaanko komento klienteillä
  if (player && !c.remote) {
    log.warn('Player %0 tried to call ´%1´, denied.', player.name.green, name);
    this.server.serverMessage('The command you tried to call is server-side only.', player.playerId);
    return;
  }

  // Validoidaan argumentit - parametrien tyyppejä ei tarkasteta vaan se on tehtävä manuaalisesti.
  for (var i = 0; i < c.params.length; i++) {
    p = c.params[i];
    // Jos parametri ei ole valinnainen ja argumentteja on liian vähän
    if (!p.optional && args.length <= i) {
      if (player) {
        this.server.serverMessage('You must give parameter {' + p.type + '} ' +
          p.name + '. See ´help ' + name + '´', player.playerId);
      } else {
        log.error('You must give parameter %0 %1. For more information see ´help %2´',
          ('{' + p.type + '}').grey, p.name.red, name);
      }
      return;
    }
  }

  // Kutsutaan funktiota
  args.unshift(player); // Lisätään pelaaja ensimmäiseksi parametriksi
  try {
    c.action.apply(this.server, args);
  } catch (e) {
    log.error('Failed to call command %0 as %1 with [%2]. See --debug (-d) for stack trace.',
      name.yellow, (player && player.name || 'server').green, args.join(', ').green);
    log.debug(e.stack);
    // Also notify player if any
    if (player) {
      this.server.serverMessage('Oops, narrowly escaped a crash! Just whoa..', player.playerId);
    }
  }
};

/**
 * Palauttaa komennon tiedot merkkijonona.
 * @param {String}  name    Komento, jonka tiedot haluat
 * @param {Boolean} format  Formatoidaanko? (värit & wtf-8)
 * @return {String}  Hienosti muotoiltu merkkijono.
 */
Command.prototype.getHelpString = function (name, format) {
  var c = Commands[name], h
    // Merkkijonojen täyttäminen ilmalla
    , pad = function (s, l, r) {
      if (r) { return new Array(Math.max(l - s.length + 1, 0)).join(' ') + s; }
      else   { return s + new Array(Math.max(l - s.length + 1, 0)).join(' '); }
    };
  if (!c) { return 'Could not find help about "' + name + '". You need ´help´.'; }
  if (format) {
    h = ' Description: '.yellow + c.help +
      // Jos on parametrejä
      (c.params.length ? '\n Params\n   '.yellow +
        // Jos niitä on useampi niin muotoillaan wtf-8:lla
        (c.params.length > 1 ? '├→' : '└→').yellow +
        // Listataan ne
        join(c.params.map(function paramLoop(p) {
          return pad((' {' + p.type + '} ').grey, 21, false)  // Tyyppi
              +  pad((p.optional ? '[' + p.name + ']' : ' ' + p.name).green, 19, false) // Nimi
              +  ' – ' + p.help; // Selitys
        // Muotoillaan wtf-8:lla taulukosta merkkijono.
        }), '\n   ├→'.yellow, '\n   └→'.yellow)
      : ''); // Ei parametrejä
  } else {
    h = ' Description: ' + c.help +
      (c.params.length ? '\n  Parameters:\n' : '') + // Sitten listataan parametrit mikäli niitä on.
      (c.params.map(function paramLoop(p) {
        return pad('  {' + p.type + '} ', 15, true) + // Tyyppi
               pad((p.optional ? '[' + p.name + ']' : p.name), 18, false) + // Nimi
               ' -- ' + p.help; // Selitys
      }).join('\n'));
  }
  return h;
};

/**
 * Palauttaa listan ehdotuksista annetulle komentorivin alulle. esim 'l' -> ['list', 'login']
 * @param {String}   partial   Käyttäjän aloittama rivi, kun hän painaa tabia.
 * @returns {Array}  Löydetyt  ehdotukset, jos niitä on vain yksi, sillä korvataan koko rivi.
 */
Command.prototype.suggest = function (partial) {
  var startsWith = function (str1, str2) { return str1.slice(0, str2.length) === str2; }
    // Yhdistetään komento-osa, välissä olevat parametrit sekä ehdotus.
    , merge = function (cmd, args, suggestion) {
      return [cmd].concat(args.slice(0, args.length - 1), suggestion).join(' ') + ' ';
    }
    , suggestions = [], param, plr
    , cmdPart = partial.split(' ')[0]             // Rivin ensimmäinen sana on tietenkin komento-osa.
    , cmd = Commands[cmdPart]                     // Yritetään lukea komento, jos se on täydellinen.
    , argPart = partial.split(' ').slice(1)       // Parametriosa talteen
    , lastArg = argPart[argPart.length - 1] || '' // Viimeinen parametri, sitä täydennetään.
    , server = this.server                        // Otetaan talteen closurea varten
    , cmds = Object.keys(Commands)                // Otetaan talteen lista komentojen nimistä
    , plrIds = Object.keys(this.server.players);  // ja lista pelaajien tunnisteista

  // Jos rivi alkaa komennolla ja sillä on parametrejä.
  if (cmd && cmd.params) {
    // Valitaan parametri, jota ollaan kirjoittamassa (tai eka, jos mitään ei ole vielä.)
    param = cmd.params[argPart.length > 0 ? argPart.length - 1 : 0];
    if (!param) { return; } // Parametriä ei löydy, eli kaikki parametrit on jo täytetty!

    switch (param.type) {
    // Täydennetään pelaajien nimimerkit
    case 'player':
      for (var j = plrIds.length; j--;) {
        plr = server.players[plrIds[j]];
        if (plr.active && plr.name && startsWith(plr.name, lastArg)) {
          suggestions.push(merge(cmdPart, argPart, plr.name));
        }
      }
      break;
    // Täydennetään komentojen nimet esim. help/commands/kick
    case 'command':
      cmds.map(function commandLoop(cmdName) {
        if (startsWith(cmdName, lastArg)) {
          suggestions.push(merge(cmdPart, argPart, cmdName));
        }
      });
      break;
    // Täydennetään alakomennot esim. config get/set/save
    case 'sub':
      cmd.sub.map(function commandLoop(cmdName) {
        if (startsWith(cmdName, lastArg)) {
          suggestions.push(merge(cmdPart, argPart, cmdName));
        }
      });
    }
  } else {
    // Jos rivi ei ala komennolla täydennetään rivin alku komennoksi.
    cmds.map(function commandLoop(cmdName) {
      if (startsWith(cmdName, partial)) {
        suggestions.push(cmdName + ' ');
      }
    });
  }

  return suggestions;
};


module.exports = Command;
