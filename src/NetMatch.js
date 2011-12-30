// Vaatii cbNetwork ja node-optimist-paketin: https://github.com/substack/node-optimist
/**#nocode+*/
var argv = require('optimist')
    .default({p : 1337, a : undefined})
    .alias({'p' : 'port', 'a' : 'address', 'd' : 'debug'})
    .argv
  , Packet = require('cbNetwork').Packet
  , NET = require('./Constants').NET
  , ITEM = require('./Constants').ITEM
  , Server = require('./Server')
  , log = require('./Utils').log
  , colors = require('colors')
  , timer = require('./Utils').timer
  , Bullet = require('./Weapon').Bullet;
/**#nocode-*/

process.title = "NetMatch server";

// Tehdään uusi palvelin.
/** @ignore */
var server = new Server({ port: argv.p, address: argv.a});

// Tehdään jotain sitä mukaa, kun dataa tulloo sissään.
server.on('message', function onServerMessage(client) {
  var data = client.data
    , msgType = data.getByte()
    , currentPlayerId
    , player
    , reply
    , sendNames = false
    , txtMessage = ""
    , playerIds;

  // Jos palvelin on sulkeutumassa, lähetetään pelaajalle siitä tieto heti
  if (this.gameState.closing) {
    reply = new Packet(2);
    reply.putByte(NET.SERVERCLOSING);
    reply.putByte(NET.END);
    client.reply(reply);
    return;
  }

  // Jos oli uusi pelaaja
  if (msgType === NET.LOGIN) {
    server.login(client);
    return;
  }

  // Luetaan lähetetty pelaajan ID, joka on pelaajan järjestysnumero ja aina väliltä 1...MAX_PLAYERS
  currentPlayerId = data.getByte();

  if (currentPlayerId < 1 || currentPlayerId > server.gameState.maxPlayers) {
    // Pelaajatunnus on väärä
    log.notice('Possible hack attempt from ' + client.address + ' Invalid player ID (' + currentPlayerId + ')');
    return;
  }

  // Haetaan pelaajan instanssi Player-luokasta
  player = this.players[currentPlayerId];


  // Tarkistetaan onko pelaaja potkittu
  if (player.kicked && player.clientId == client.id) {
    reply = new Packet(7);
    reply.putByte(NET.KICKED);
    reply.putByte(player.kickerId);
    reply.putByte(currentPlayerId);
    reply.putString(player.kickReason);
    client.reply(reply);
    return;
  }

  if (player.clientId != client.id || !player.active) {
    //log.notice("Possible hack attempt from " + client.address + " Not logged in (" + currentPlayerId + ")");
    reply = new Packet(1);
    reply.putByte(NET.NOLOGIN);
    client.reply(reply);
    return;
  }

  // Pelaaja poistuu pelistä
  if (msgType === NET.LOGOUT) {
    server.logout(currentPlayerId);
    return;
  }

  // Lasketaan pelaajan ja serverin välinen lagi
  player.lag = timer() - player.lastActivity;

  // Päivitetään pelaajan olemassaolo
  player.lastActivity = timer();

  // Luetaan saapuneita viestejä
  while (msgType) {
    if (msgType === NET.PLAYER) {
      // Pelaajan dataa
      var x     = data.getShort()   // x-position
        , y     = data.getShort()   // y-position
        , angle = data.getShort()   // kulma
        , b     = data.getByte();   // Tämä tavu sisältää useamman muuttujan (alempana)

        // Puretaan b-tavu muuttujiin
      // Jos halutaan esim. lukea 4 bittiä kohdasta 0, menee lauseke seuraavasti:
      // var value = (b << (32-0-4)) >> (32-4)
      var weapon   = (b << 28) >> 28      // Valittuna oleva ase (bitit 0-3)
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
            log.info('Player ' + player.name.yellow + ' is shooting a new bullet from weapon ' + player.weapon);
          }
          new Bullet(server, currentPlayerId);
          //console.dir(this.bullets);
        }

        // Poimittiinko jotain
        if (picked > 0 && server.items.hasOwnProperty(picked)) {
          var itemType = server.items[picked].pick();
          // Poimittiinko healthpack
          if (itemType === ITEM.HEALTH) {
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

    } else if (msgType === NET.PLAYERNAME) {
      // Nimilista pyydetty
      sendNames = true;

    } else if (msgType === NET.TEXTMESSAGE) {
      // Pelaaja lähetti tsättiviestin
      txtMessage = data.getString().trim();
      if (txtMessage.charAt(0) === '/') {
        // UNIMPLEMENTED
        // Komento
        log.info('Player ' + player.name + ' sent a command: ' + txtMessage);
        txtMessage = "";
      } else {
        // Ei ollut komento, logataanpas tämä.
        log.write('<' + player.name + '> ' + txtMessage);
      }

    } else if (msgType === NET.MAPCHANGE) {
      // Pelaaja lähetti kartan nimen
      player.mapName = data.getString().trim();

    } else {
      // Viestit loppui tai tuli tuntematon viesti
      break;
    }
    // Seuraava viesti
    msgType = data.getByte();
  }

  // UNIMPLEMENTED
  // Jos erä on päättynyt niin lähetetään kaikkien pelaajien tiedot
  // sendNames = true;

  // Lähetetään clientille dataa
  reply = new Packet();

  // Lähetetään kaikkien pelaajien tiedot
  playerIds = Object.keys(server.players);
  for (var i = playerIds.length; i--;) {
    var plr = server.players[playerIds[i]];
    // Onko pyydetty nimet
    if (sendNames) {
      if (plr.active) {
        reply.putByte(NET.PLAYERNAME);  // Nimet
        reply.putByte(plr.playerId);    // Pelaajan tunnus
        reply.putString(plr.name);      // Nimi
        reply.putByte(plr.zombie);      // Onko botti
        reply.putByte(plr.team);        // Joukkue
      }
    }

    // Onko lähetetty tsättiviesti
    if (txtMessage.length > 0) {
      var msgData = {
        msgType: NET.TEXTMESSAGE,
        playerId: currentPlayerId,
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
    }

    // Lähetetään niiden pelaajien tiedot jotka ovat hengissä ja näkyvissä
    if (plr.active) {
      var visible = true
        , x1 = player.x
        , y1 = player.y
        , x2 = plr.x
        , y2 = plr.y;
      if ((Math.abs(x1 - x2) > 450) || (Math.abs(y1 - y2) > 350)) {
        visible = false;
      }

      // Onko näkyvissä vai voidaanko muuten lähettää
      if (sendNames || visible || plr.health <= 0) {
        // Näkyy
        reply.putByte(NET.PLAYER);    // Pelaajan tietoja
        reply.putByte(plr.playerId);  // Pelaajan tunnus
        reply.putShort(plr.x);        // Sijainti
        reply.putShort(plr.y);        // Sijainti
        reply.putShort(plr.angle);    // Kulma

        // Spawn-protect
        var isProtected = 0;
        if (plr.spawnTime + server.gameState.spawnProtection > timer()) {
          isProtected = 1;
        }

        // Muutetaan team arvo välille 0-1
        var teamBit = (plr.team === 2 ? 1 : 0);

        // Tungetaan yhteen tavuun useampi muuttuja
        var b = ((plr.weapon % 16) << 0)  // Ase (bitit 0-3)
              + ((plr.hasAmmos << 4))     // Onko ammuksia (bitti 4)
              + ((teamBit << 6))          // Joukkue/tiimi (bitti 6)
              + ((isProtected << 7));     // Haavoittumaton (bitti 7)
        reply.putByte(b);

        reply.putByte(plr.health);      // Terveys
        reply.putShort(plr.kills);      // Tapot
        reply.putShort(plr.deaths);     // Kuolemat
      } else if (server.gameState.radarArrows || server.gameState.playMode === 2) {
        // Ei näy. Lähetetään tutkatieto. playMode === 2 tarkoittaa TDM-pelimuotoa
        if (player.team === plr.team || server.gameState.radarArrows) {
          // Lähetetään tutkatiedot jos joukkueet ovat samat tai asetuksista on laitettu että
          // kaikkien joukkueiden pelaajien tutkatiedot lähetetään
          reply.putByte(NET.RADAR); // Tutkatietoa tulossa
          // UNIMPLEMENTED
          // Missä kulmassa tutkan pitäisi olla
          reply.putByte(0);         // Kulma muutettuna välille 0-255
          reply.putByte(plr.team);  // Pelaajan joukkue
        }
      }
    }
  }

  // UNIMPLEMENTED
  // Kartan vaihtaminen

  // Lähetetään kaikki pelaajalle osoitetut viestit
  server.messages.fetch(currentPlayerId, reply);


  // Jos on pyydetty nimilista niin palautetaan myös kaikkien tavaroiden tiedot
  if (sendNames) {
    var itemIds = Object.keys(this.items);
    for (var i = itemIds.length; i--;) {
      var item = this.items[itemIds[i]];
      this.messages.add(currentPlayerId, {
        msgType: NET.ITEM,
        itemId: item.id,
        itemType: item.type,
        x: item.x,
        y: item.y
      });
    }
  }

  // UNIMPLEMENTED
  // Pelisession aikatiedot

  reply.putByte(NET.END);
  client.reply(reply);

  // Dodiin, valmiita ollaan :)
  return;
});