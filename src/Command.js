var log = require('./Utils').log
  , NET = require('./Constants').NET;


function Commands(server) {
  this.server = server;
  this.commands = [];
  this.initialize();
}

Commands.prototype.initialize = function () {
  // Helppi
  this.add(['help'], [
      {name: 'command', type: 'string', optional: true, help: 'Which command\'s help to show'}
    ], 'Shows help about this server\'s commands. See ´commands´ for list of available commands.', function helpCommand(args) {
      if (!args.length) {
        console.log(this.commands.help('help'));
      } else {
        console.log(this.commands.help(args[0]));
      }
    }
  );

  // Komentojen listaus
  this.add(['commands'], [
      {name: 'verbose', type: 'boolean', optional: true, help: 'Spam a lot.'}
    ], 'Lists available commands.', function commandsCommand(args) {
      var server = this;
      if (!args[0]) {
        console.log('Commands: '.green + this.commands.commands.map(function (i) { return i.aliases[0]; }).join(', '));
      } else { // Verbose
        this.commands.commands.map(function (i) {
          console.log(i.aliases[0].toUpperCase().green);
          console.log(server.commands.help(i.aliases[0]));
        });
      }
    }
  );

  // Serverviestien lähetys
  this.add(['say', 'msg'], [
      {name: 'message', type: 'string', optional: false, help: 'Message to send to all players'}
    ], 'Sends a server message to all players.', function sayCommand(args) {
      log.write('<Server>'.blue + ' %0', args.join(' '));
      this.messages.addToAll({
        msgType: NET.SERVERMSG,
        msgText: args.join(' ')
      });
    }
  );

  // Servun sulkeminen
  this.add(['close', 'exit', 'stop'], [], 'Closes the server.', function closeCommand() {
    this.close();
  });

  // Uptime
  this.add(['uptime'], [], 'Shows how long the server has been running.', function uptimeCommand() {
    var t = secondsToTime(Math.floor(process.uptime()));
    log.info('This server has been running for %0 days %1 hours %2 minutes and %3 seconds.', t.d, t.h, t.m, t.s);
  });

  // Pelaajan uudelleennimeäminen >:)
  this.add(['rename'], [
      {name: 'player', type: 'string/id', optional: false, help: 'Player who needs to be renamed'},
      {name: 'name', type: 'string', optional: false, help: 'New name'}
    ], 'Renames the player', function renameCommand(args) {
      var plr, playerIds, player;
      // Hankitaan nimi jos annettiin ID
      if (!/\D/.test(args[0])) {
        if (this.players[args[0]]) {
          args[0] = this.players[args[0]].name;
        } else {
          log.notice('Player "%0" doesn\'t seem to exist.', args[0].green);
          return;
        }
      }
      // Jos nimi löytyi, ...
      if (args[0]) {
        // niin luupataan kaikki pelaajat ja etsitään haluamamme pelaaja.
        playerIds = Object.keys(this.players)
        for (var i = playerIds.length; i--;) {
          plr = this.players[playerIds[i]];
          plr.sendNames = true; // Kaikkien pitää päivittää nimitiedot
          if (plr.name === args[0]) {
            player = plr;
          } else if (plr.name === args[1]) {
            log.notice('Name "%0" is already in use!', args[1].green);
            return;
          }
        }
      }
      if (!player) {
        log.notice('Player "%0" doesn\'t seem to exist.', args[0].green);
      } else {
        player.name = args[1];
        log.info('Renamed "%0" -> "%1" >:)', args[0].green, args[1].green);
      }
    }
  );

  // Listaa kirjautuneet pelaajat
  this.add(['list', 'names'], [], 'Lists all connected players.', function listCommand() {
    var plr, plrs = [], playerIds = Object.keys(this.players)
    for (var i = playerIds.length; i--;) {
      plr = this.players[playerIds[i]];
      if (plr.active) {
        plrs.push(plr.name);
      }
    }
    log.info('There are %0 players connected: %1', plrs.length, plrs.join(', '));
  });

    // Pelaajan potkaiseminen.
  this.add(['kick'], [
      {name: 'player', type: 'string/id', optional: false, help: 'Player to be kicked'},
      {name: 'reason', type: 'string', optional: true, help: 'Why would you do such an evil thing?'}
    ], 'Kicks the player from the server.', function kickCommand(args) {
      var plr, playerIds;
      // Hankitaan nimi jos annettiin ID
      if (!/\D/.test(args[0])) {
        plr = this.players[args[0]];
        if (plr && plr.active && !plr.zombie) {
          this.kickPlayer(plr.playerId, plr.playerId, args[1]);
          log.info('Player kicked!');
          return;
        } else {
          log.notice('Player "%0" doesn\'t seem to exist.', args[0].green);
          return;
        }
      }
      // Jos nimi löytyi, ...
      if (args[0]) {
        // niin luupataan kaikki pelaajat ja etsitään haluamamme pelaaja.
        playerIds = Object.keys(this.players)
        for (var i = playerIds.length; i--;) {
          plr = this.players[playerIds[i]];
          if (plr.name === args[0] && plr.active && ! plr.zombie) {
            this.kickPlayer(plr.playerId, plr.playerId, args[1]);
            log.info('Player kicked!');
            return;
          }
        }
      }
    }
  );
  
};

Commands.prototype.add = function (names, args, help, action) {
  this.commands.push({
    aliases: names,
    params: args,
    description: help,
    action: action
  });
}

Commands.prototype.get = function (name) {
  for (var i = this.commands.length; i--;) {
    var c = this.commands[i];
    if (c.aliases.indexOf(name) !== -1) {
      return c;
    }
  }
};

Commands.prototype.call = function (name, args) {
  var c = this.get(name);
  if (!c) {
    log.error('Command "%0" not recognized. You need ´help´.', name.yellow);
    return;
  }
  // Validoidaan argumentit - parametrien tyyppejä ei tarkasteta tässä vaan se on tehtävä manuaalisesti
  for (var i = 0; i < c.params.length; i++) {
    var p = c.params[i];
    // Jos parametri ei ole valinnainen ja argumentteja on liian vähän
    if (!p.optional && args.length <= i) {
      log.error('You must give parameter %0 %1. For more information see ´help %2´', ('{' + p.type + '}').grey, p.name.red, c.aliases[0]);
      return;
    }
  }
  
  c.action.call(this.server, args);
};

Commands.prototype.help = function (name) {
  var c = this.get(name)
  if (!c) {
    return 'Could not find help about "' + name + '". You need ´help´.';
  }
  var h =                     ' Description: '.yellow + c.description +
    (c.aliases.length > 1 ? '\n     Aliases: '.yellow + c.aliases.join(', ') : '') +
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

module.exports = Commands;