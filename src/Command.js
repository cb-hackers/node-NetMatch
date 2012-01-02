/**
 * @fileOverview Serverikomentoihin liittyvät toiminnot
 */

/**#nocode+*/
var log = require('./Utils').log
  , NET = require('./Constants').NET;
/**#nocode-*/

/**
 * @private
 * @namespace Sisältää serverikomennot, joihin pääsee käsiksi {@link Command}-luokan call-metodilla.
 *
 * Komennot muodostuvat seuraavasti:
 * @property {Array}    params           Parametrit
 * @property {String}   params.name      Parametrin nimi
 * @property {String}   params.type      Parametrin tyyppi
 * @property {Boolean}  params.optional  Onko parametri vapaaehtoinen
 * @property {String}   params.help      Mihin parametriä käytetään
 * @property {String}   help             Mihin komentoa käytetään
 * @property {Boolean}  remote           Voiko komentoa kutsua klientillä
 * @property {Function} action           Komennon logiikka
 */
var Commands = {};

/**
 * Help-komento tulostaa tietoja halutusta komennosta.
 * @param {String} [command]  Minkä komennot salat paljastetaan
 */
Commands.help = {
  params: [
    {name: 'command', type: 'string', optional: true, help: 'Which command\'s help to show'}
  ],
  help: 'Shows help about this server\'s commands. See ´commands´ for list of available commands.',
  remote: true,
  action: function commandsHelp() {
    if (!arguments.length) {
      console.log(this.commands.getHelpString('help'));
    } else {
      console.log(this.commands.getHelpString(arguments[0]));
    }
  }
};

/**
 * Listaa kaikki komennot.
 * @param {Boolean} [verbose]  Tulostetaanko samalla helpit.
 */
Commands.commands = {
  params: [
    {name: 'verbose', type: 'boolean', optional: true, help: 'Spam a lot.'}
  ],
  help: 'Lists available commands.',
  remote: true,
  action: function commandsCommands() {
    var server = this;
    if (!arguments[0]) {
      console.log('Commands: '.green + Object.keys(Commands).join(', '));
    } else { // Verbose
      Object.keys(Commands).map(function (i) {
        console.log(i.toUpperCase().green);
        console.log(server.commands.getHelpString(i));
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
    var msg = Array.prototype.slice.call(arguments, 0).join(' ');
    this.serverMessage(msg);
  }
};

/**
 * Sulkee palvelimen.
 */
Commands.close = {
  params: [],
  help: 'Closes the server.',
  remote: true,
  action: function commandsClose() {
    this.close();
  }
};

/**
 * Kertoo kauanko palvelin on ollut päällä.
 */
Commands.uptime = {
  params: [],
  help: 'Displays how long has the server been running.',
  remote: true,
  action: function commandsUptime() {
    var t = secondsToTime(Math.floor(process.uptime()));
    this.serverMessage('This server has been running for ' + t.d + 
      ' days ' + t.h + ' hours ' + t.m + ' minutes and ' + t.s + ' seconds.');
  }
};

/**
 * Uudelleennimeää pelaajan.
 * @param {Player} who   Pelaaja, joka uudelleennimetään. Nimi tai ID kelpaa
 * @param {String} name  Uusi nimi
 */
Commands.rename = {
  params: [
    {name: 'who',  type: 'player', optional: false, help: 'Player who needs to be renamed'},
    {name: 'name', type: 'string', optional: false, help: 'New name'}
  ],
  help: 'Renames a player.',
  remote: true,
  action: function commandsRename() {
    var plr, playerIds, player
      , plrName = arguments[0]
      , newName = arguments[1];

    // Jos annettiinkin ID, niin vaihdetaan se nimeksi
    if (this.players[plrName]) {
      plrName = this.players[plrName].name;
    }

    // Luupataan kaikki pelaajat ja etsitään haluamamme pelaaja.
    playerIds = Object.keys(this.players)
    for (var i = playerIds.length; i--;) {
      plr = this.players[playerIds[i]];
      plr.sendNames = true; // Kaikkien pitää päivittää nimitiedot
      // Ei anneta vaihtaa nimeä, jos uusi nimi on jo käytössä
      if (plr.name === newName) {
        log.notice('Name "%0" is already in use!', newName.green);
        return;
      }
      if (plr.name === plrName && !plr.zombie && plr.active) {
        player = plr;
      }
    }

    // Jos pelaaja löytyi, vaihdetaan nimi.
    if (!player) {
      log.notice('Sorry, player couldn\'t be found or you tried to rename a bot.');
    } else {
      player.name = newName;
      log.info('Renamed "%0" -> "%1" >:)', plrName.green, newName.green);
    }
  }
};

/**
 * Listaa paikalla olevat pelaajat.
 */
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
      , plrName = arguments[0]
      , reason  = arguments[1] || '';

    // Jos annettiinkin ID, niin vaihdetaan se nimeksi
    if (this.players[plrName]) {
      plrName = this.players[plrName].name;
    }
    
    player = this.getPlayer(plrName);
    if (!player) {
      log.notice('Sorry, player couldn\'t be found.');
    } else {
      // Vaihdetaan toinen parametri nollaksi, kun klientti on pätsätty, muuten MAV.
      this.kickPlayer(player.playerId, player.playerId, reason);
    }
    
  }
}

/**
 * Kirjaa pelaajan sisään adminiksi.
 * @param {Player} who    Pelaaja, joka kirjautuu
 * @param {String} pass   Salasana
 */
Commands.login = {
  params: [
    {name: 'who',  type: 'player',  optional: false, help: 'Player\'s (your) name.'},
    {name: 'pass', type: 'string',  optional: false, help: 'Password'}
  ],
  help: 'Logs a player in.',
  remote: true,
  action: function commandsLogin() {
    var player = this.getPlayer(arguments[0])
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
      this.serverMessage('You are now an admin!', player.playerId)
    } else {
      log.warn('Incorrect password!');
    }
  }
};

/**
 * Hoitaa komentojen sisäisen käsittelyn ja toteutuksen
 * @class Komentojen käsittely
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
  var c = Commands[name];
  if (!c) {
    log.error('Command "%0" not recognized. You need ´help´.', name.yellow);
    return;
  }
  // Tarkistetaan sallitaanko komento klienteillä
  if (player && !c.remote) {
    log.warn('Player %0 tried to call ´%1´, denied.', player.name.green, name);
    return;
  }
  
  // Validoidaan argumentit - parametrien tyyppejä ei tarkasteta tässä vaan se on tehtävä manuaalisesti
  for (var i = 0; i < c.params.length; i++) {
    var p = c.params[i];
    // Jos parametri ei ole valinnainen ja argumentteja on liian vähän
    if (!p.optional && args.length <= i) {
      log.error('You must give parameter %0 %1. For more information see ´help %2´', ('{' + p.type + '}').grey, p.name.red, name);
      return;
    }
  }
  // Kutsutaan funktiota
  c.action.apply(this.server, args);
};

/**
 * Luo merkkijonon, joka kertoo komennon tiedot hienosti muotoiltuna.
 * @param {String} name  Komento, jonka tiedot haluat
 */
Command.prototype.getHelpString = function (name) {
  var c = Commands[name];
  if (!c) {
    return 'Could not find help about "' + name + '". You need ´help´.';
  }
  var h =                     ' Description: '.yellow + c.help +
    (c.params.length ?      '\n  Parameters: '.yellow : '');
  // List parameters
  for (var i = 0; i < c.params.length; i++) {
    var p = c.params[i];
    h += '\n' +
      // Type
      padString('  {' + p.type + '} ', 15, true).grey +
      // Name
      padString((p.optional ? '[' + p.name + ']' : p.name), 10, false) +
      // Description
      ' – ' + p.help;
  }
  return h;
};

Command.prototype.suggest = function (partial) {
  var suggestions = [], plr
    , cmds = Object.keys(Commands)
    , cmdPart = partial.split(' ')[0]
    , args = partial.split(' ').slice(1)
    , playerIds = Object.keys(this.server.players)
    , c = Commands[cmdPart];

  // Jos rivi alkaa komennolla
  if (c) {
    // Luupataan sen argumentit
    for (var i = 0; i < c.params.length; i++) {
      var p = c.params[i];
      switch (p.type) {
      case "player":
        // Tarkistetaan onko parametrin alku joku pelaajista
        for (var j = playerIds.length; j--;) {
          plr = this.server.players[playerIds[j]];
          if (startsWith(plr.name, args[i]) && !plr.zombie) {
            // Pelaajan nimi alkaa argumentin alulla.
            suggestions.push(cmdPart + ' ' + plr.name);
          }
        }
        break;
        // TODO: Muut + säätö
      }
    }
  }
  // Se ei ole jo komento
  if (!c) {
    Object.keys(Commands).map(function (i) {
      if (startsWith(i, partial)) {
        suggestions.push(i + ' ');
      }
    });
  }
  return suggestions;
};


function startsWith(str1, str) {
  return str1.slice(0, str.length) === str;
}

// http://codeaid.net/javascript/convert-seconds-to-hours-minutes-and-seconds-(javascript) Vähän editoituna
function secondsToTime(secs) {
  var days = Math.floor(secs / (60 * 60 * 24))
    , divisor_for_hours = secs % (60 * 60 * 24)
    , hours = Math.floor(divisor_for_hours / (60 * 60))
    , divisor_for_minutes = secs % (60 * 60)
    , minutes = Math.floor(divisor_for_minutes / 60)
    , divisor_for_seconds = divisor_for_minutes % 60
    , seconds = Math.ceil(divisor_for_seconds)
  return {"d": days, "h": hours, "m": minutes, "s": seconds};
}

// Thanks for benvie at #node for help!
function padString(s, l, r) {
  if (r) {
    return Array(Math.max(l - s.length + 1, 0)).join(' ') + s;
  } else {
    return s + Array(Math.max(l - s.length + 1, 0)).join(' ')
  }
}

module.exports = Command;
