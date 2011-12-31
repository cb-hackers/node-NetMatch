// Vaatii cbNetwork ja node-optimist-paketin: https://github.com/substack/node-optimist
/**#nocode+*/
var argv = require('optimist')
    .default({p : 1337, a : undefined, d: false})
    .alias({'p' : 'port', 'a' : 'address', 'd' : 'debug'})
    .argv
  , Packet = require('cbNetwork').Packet
  , NET = require('./Constants').NET
  , ITM = require('./Constants').ITM
  , Server = require('./Server')
  , log = require('./Utils').log
  , colors = require('colors')
  , timer = require('./Utils').timer
  , Bullet = require('./Weapon').Bullet;
/**#nocode-*/

process.title = "NetMatch server";

// Tehdään uusi palvelin.
/** @ignore */
var server = new Server(argv.p, argv.a, argv.d);

server.on(NET.LOGIN, function NetLogin(client) {
  // Joku pyrkii sisään
  server.login(client);
});

server.on(NET.LOGOUT, function NetLogout(client, playerId) {
  // Heitä pelaaja pellolle
  server.logout(playerId);
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
      if (argv.d) {
        log.info('Player ' + player.name.yellow +
        ' is shooting a new bullet from weapon ' + player.weapon);
      }
      new Bullet(server, player.playerId);
      //console.dir(this.bullets);
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
  txtMessage = client.data.getString().trim();
  if (txtMessage.charAt(0) === '/') {
    // UNIMPLEMENTED
    // Komento
    log.notice('Player ' + player.name + ' sent a command: ' + txtMessage);
    txtMessage = "";
  } else {
    // Ei ollut komento, logataanpas tämä.
    log.write('<' + player.name + '> ' + txtMessage);
  }

  var msgData = {
    msgType: NET.TEXTMESSAGE,
    playerId: player.playerId,
    msgText: txtMessage
  };
  // Lähetetään kaikille muille paitsi boteille
  if (plr.active && !plr.zombie) {
    if (txtMessage.charAt(0) === '*') {
      // Lähetetään vain omalle joukkueelle tämä viesti
      if (plr.team === player.team) {
        server.messages.add(plr.playerId, msgData);
      }
    } else {
      // Ei ollut tähteä ekana kirjaimena, joten tämä viesit on julkinen ja lähtee kaikille.
      server.messages.add(plr.playerId, msgData);
    }
  }
});

server.on(NET.MAPCHANGE, function NetMapChange(client, player) {
  // Pelaaja lähetti kartan nimen
  player.mapName = client.data.getString().trim();
});
