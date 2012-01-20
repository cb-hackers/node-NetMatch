/**
 * @fileOverview Ajettava palvelin
 */

"use strict";

/**#nocode+*/
var argv = require('optimist')
    .default({d: false, c: 'config'})
    .alias({'p' : 'port', 'a' : 'address', 'd' : 'debug', 'c': 'config', 'h': 'help'})
    .describe({
      'h': 'Shows this help and exits.',
      'c': 'Load config from this file default is `config`, do not use file extension.',
      'p': 'Port to listen to. Clients must connect to this port (overrides config).',
      'a': 'Address to bind to defaults to all addresses (overrides config).',
      'd': 'Spam a lot.'})
    .usage('Run NetMatch server: $0')
    .check(function (a) {return !a.h;}) // Näytetään helppi, jos -h tai --help
    .argv // Palautetaan parametrit opjektina, jotta niitä
  // Nettimättö-juttuja
  , Packet = require('cbNetwork').Packet
  , Server = require('./Server')
  , Bullet = require('./Bullet')
  // Vakioita
  , NET = require('./Constants').NET
  , ITM = require('./Constants').ITM
  // Utilsseja
  , split  = require('./Utils').splitString
  , log    = require('./Utils').log
  , colors = require('colors');

process.title = "NetMatch server";

var VERSION = "v2.4b";

// Tehdään uusi palvelin.
var server = new Server(argv, VERSION);

// Käsitellään viestejä klienteiltä

server.on(NET.LOGIN, function NetLogin(client) {
  // Joku pyrkii sisään
  server.login(client);
});

server.on(NET.LOGOUT, function NetLogout(client, player) {
  // Heitä pelaaja pellolle
  server.logout(player);
});

server.on(NET.PLAYER, function NetPlayer(client, player) {
  // Pelaajan dataa
  var data = client.data
    , x     = data.getShort()   // x-position
    , y     = data.getShort()   // y-position
    , angle = data.getShort()   // kulma
    , b     = data.getByte();   // Tämä tavu sisältää useamman muuttujan (alempana)

  // Puretaan b-tavu muuttujiin
  // Jos halutaan esim. lukea 4 bittiä kohdasta 0, menee lauseke seuraavasti:
  // var value = (b << (32-0-4)) >> (32-4)
  var weapon   =   (b << 28) >> 28    // Valittuna oleva ase (bitit 0-3)
    , hasAmmo  = -((b << 27) >> 31)   // Onko valitussa aseessa ammuksia (bitti 4)
    , shooting = -((b << 26) >> 31);  // Ampuuko (bitti 5)

  var picked  = data.getByte(); // Poimitun itemin id (0, jos ei poimittu)

  // Arvot päivitetään vain jos pelaaja on hengissä
  if (!player.isDead) {
    player.x        = x;
    player.y        = y;
    player.angle    = angle;
    player.weapon   = weapon;
    player.hasAmmos = hasAmmo;

    // UNIMPLEMENTED
    // speedhack

    if (shooting === 1) {
      server.createBullet(player);
    }

    // Poimittiinko jotain
    if (picked > 0 && server.items.hasOwnProperty(picked)) {
      var itemType = server.items[picked].pick();
      // Poimittiinko healthpack
      if (itemType === ITM.HEALTH) {
        player.health = Math.min(100, player.health + 50);
      }
    }
  }
  if (player.health > 0) {
    player.isDead = false;
  }
  if (!player.loggedIn) {
    player.loggedIn = true;
  }
});

server.on(NET.PLAYERNAME, function NetPlayerName(client, player) {
  // Pelaaja pyytää nimilistaa
  player.sendNames = true;
});

server.on(NET.TEXTMESSAGE, function NetTextMessage(client, player) {
  // Pelaaja lähetti tsättiviestin
  var txtMessage = client.data.getString().trim(), cmd;
  if (txtMessage.charAt(0) === '/') {
    cmd = txtMessage.split(' ')[0].slice(1);
    // Komennot vaativat admin-oikeudet
    if (player.admin) {
      log.notice('Player %0 called ´%1´', player.name.green, txtMessage);
      server.commands.call(cmd, split(txtMessage).splice(1), player);
    // Sallitaan kirjautumisen yrittäminen kuitenkin. :P
    } else if (cmd === 'login') {
      cmd = txtMessage.split(' ').splice(1);
      log.notice('Player %0 is trying to login with password ´%1´.', player.name.green, String(cmd[0]).red);
      server.commands.call('login', cmd, player);
    } else {
      log.warn('Player %0 tried to call ´%1´ without admin rights, access denied.', player.name.green, cmd);
      server.serverMessage('You need to login as admin to use commands.', player);
    }
  } else {
    // Ei ollut komento, logataanpas tämä.
    log.write('<' + player.name + '> ' + txtMessage);

    var msgData = {
      msgType: NET.TEXTMESSAGE,
      player: player,
      msgText: txtMessage
    };
    // Lähetetään kaikille muille paitsi boteille
    if (txtMessage.charAt(0) === '*') {
      // Lähetetään vain omalle joukkueelle tämä viesti
      server.messages.addToTeam(player.team, msgData);
    } else {
      // Ei ollut tähteä ekana kirjaimena, joten tämä viesit on julkinen ja lähtee kaikille.
      server.messages.addToAll(msgData);
    }
  }
});

server.on(NET.MAPCHANGE, function NetMapChange(client, player) {
  // Pelaaja lähetti kartan nimen
  player.mapName = client.data.getString().trim();
});
