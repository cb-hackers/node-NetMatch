/**
 * @fileOverview Pitää sisällään {@link Server} nimiavaruuden.
 */

// Vaatii cbNetwork, colors ja node-optimist paketit: https://github.com/substack/node-optimist
/**#nocode+*/
var cbNetwork = require('cbNetwork')
  , Packet = cbNetwork.Packet
  , EventEmitter = process.EventEmitter
  , Player = require('./Player')
  , NetMessages = require('./NetMessage')
  , NET = require('./Constants').NET
  , WPN = require('./Constants').WPN
  , ITEM = require('./Constants').ITEM
  , log = require('./Utils').log
  , timer = require('./Utils').timer
  , colors = require('colors')
  , Map = require('./Map').Map
  , Input = require('./Input')
  , Item = require('./Item');
/**#nocode-*/

/**
 * Luo uuden palvelimen annettuun porttiin ja osoitteeseen. Kun palvelimeen tulee dataa, emittoi
 * se <i>message</i> eventin, kts. {@link Server#event:message}
 *
 * @class Yleiset Serverin funktiot ja ominaisuudet
 *
 * @param {Object} c            Asetukset, kts. {@link Server.config}
 * @param {Number} c.port       Portti, jota palvelin kuuntelee.
 * @param {String} [c.address]  IP-osoite, jota palvelin kuuntelee. Jos tätä ei anneta, järjestelmä
 *                              yrittää kuunnella kaikkia osoitteita.
 */
function Server(port, address, debug) {
  this.debug = debug;
  /**
   * cbNetwork-node UDP-palvelin
   * @type cbNetwork.Server
   * @see <a href="http://vesq.github.com/cbNetwork-node/doc/symbols/Server.html">cbNetwork.Server</a>
   */
  this.server = new cbNetwork.Server(port, address);

  var self = this;
  this.server.on('message', function emitMessage(client) {
    var data = client.data
      , msgType = data.getByte()
      , currentPlayerId;
    // Onko servu sammumassa?
    if (self.gameState.closing) {
      reply = new Packet(2);
      reply.putByte(NET.SERVERCLOSING);
      reply.putByte(NET.END);
      client.reply(reply);
      return;
    }

    if (msgType === NET.LOGIN) {
      // Login paketissa ei ole pelaajan ID:tä vielä, joten se on käsiteltävä erikseen
      self.emit(NET.LOGIN, client);
      return;
    }

    // Luetaan lähetetty pelaajan ID, joka on pelaajan järjestysnumero ja aina väliltä 1...MAX_PLAYERS
    currentPlayerId = data.getByte();
    // Tai jos ei ole niin sitten ei päästetä sisään >:(
    if (currentPlayerId < 1 || currentPlayerId > self.gameState.maxPlayers) {
      log.notice('Possible hack attempt from ' + client.address + ' Invalid player ID (' + currentPlayerId + ')');
      return;
    }

    // Haetaan pelaajan instanssi Player-luokasta
    player = self.players[currentPlayerId];

    // Tarkistetaan onko pelaaja potkittu
    if (player.kicked && player.clientId === client.id) {
      reply = new Packet(7);
      reply.putByte(NET.KICKED);
      reply.putByte(player.kickerId);
      reply.putByte(currentPlayerId);
      reply.putString(player.kickReason);
      client.reply(reply);
      return;
    }
    // Vielä yksi tarkistus
    if (player.clientId !== client.id || !player.active) {
      reply = new Packet(1);
      reply.putByte(NET.NOLOGIN);
      client.reply(reply);
      return;
    }

    // Logout on erikseen, koska sen jälkeen ei varmasti tule mitään muuta
    if (msgType === NET.LOGOUT) {
      self.emit(NET.LOGOUT, client, currentPlayerId);
      return;
    }

    // Lasketaan pelaajan ja serverin välinen lagi
    player.lag = timer() - player.lastActivity;
    // Päivitetään pelaajan olemassaolo
    player.lastActivity = timer();

    // Luupataan kaikkien pakettien läpi
    while (msgType) {
      /*log.info(NET[msgType]);
      // Tuli outoa dataa, POIS!
      if (!NET[msgType]) {
        break;
      }*/
      // Lähetetään tietoa paketista käsiteltäväksi
      self.emit(msgType, client, player);
      msgType = data.getByte();
    }

    // Lähetetään dataa pelaajalle
    self.sendData(client, player);

    // Valmis! :)
  });

  /**
   * Pelaajille lähetettävät viestit. Tämä on instanssi {@link NetMessages}-luokasta.
   * @see NetMessages
   */
  this.messages = new NetMessages(this);

  /**
   * Asetukset tälle palvelimelle
   * @type Object
   * @see Server.config
   */
  this.config = Server.config;

  /** Sisältää pelin nykyisestä tilanteesta kertovat muuttujat. */
  this.gameState = {};
  this.gameState.playerCount = 0;
  this.gameState.gameMode = this.config.gameMode;
  this.gameState.maxPlayers = this.config.maxPlayers;

  // Ladataan kartta
  this.gameState.map = new Map(this.config.map);
  if (!this.gameState.map.loaded) {
    log.fatal('Could not load map "%0"', this.config.map);
    this.close();
    return;
  }

  /** Sisältää kaikki kartat */
  this.maps = {};
  this.maps[this.gameState.map.name] = this.gameState.map;

  /**
   * Sisältää palvelimen pelaajat, eli luokan {@link Player} jäsenet.
   * Pääset yksittäisen pelaajan dataan näin:
   * @example
   * // Oletetaan että muuttujaan server on luotu NetMatch-palvelin.
   *
   * // Tulostaa konsoliin ID:n 4 pelaajan nimen.
   * console.log( server.players[4].name );
   */
  this.players = {};

  // Alustetaan pelaajat
  for (var i = 1; i <= this.config.maxPlayers; ++i) {
    var pl = new Player();
    pl.playerId = i;
    pl.active = false;
    pl.team = 1;
    pl.botName = "Bot_" + i;
    pl.clientId = "";
    pl.active = false;
    pl.loggedIn = false;
    pl.name = "";
    var skill = 21 - pl.playerId; // Botteja hieman eritasoisiksi vissiinkin?
    pl.fightRotate = 1.5 + (skill / 1.5);
    pl.shootingAngle = 4.0 + (pl.playerId * 1.5);
    pl.fov = 100 + (skill * 3.5);
    pl.hasAmmos = false;
    pl.admin = false;
    pl.kicked = false;
    pl.kickReason = "";
    pl.sendNames = false;
    this.players[i] = pl;
  }

  /**
   * Sisältää palvelimen ammukset, eli luokan {@link Weapon} jäsenet.
   */
  this.bullets = [];

  /**
   * @private
   */
  this.lastBulletId = 0;

  /**
   * Sisältää palvelimella maassa olevat tavarat, kts. {@link Item}.
   */
  this.items = {};

  // Alustetaan itemit
  var mapConfig = this.gameState.map.config;
  var itemId = 0;
  for (var i = mapConfig.healthItems - 1; i--;) {
    new Item(this, ++itemId, ITEM.HEALTH);
  }
  for (var i = mapConfig.mgunItems - 1; i--;) {
    new Item(this, ++itemId, ITEM.AMMO);
  }
  for (var i = mapConfig.bazookaItems - 1; i--;) {
    new Item(this, ++itemId, ITEM.ROCKET);
  }
  for (var i = mapConfig.shotgunItems - 1; i--;) {
    new Item(this, ++itemId, ITEM.FUEL);
  }
  for (var i = mapConfig.launcherItems - 1; i--;) {
    new Item(this, ++itemId, ITEM.SHOTGUN);
  }
  for (var i = mapConfig.chainsawItems - 1; i--;) {
    new Item(this, ++itemId, ITEM.LAUNCHER);
  }

  // Avataan Input
  new Input(this);

  log.info('Server initialized successfully.');
}

// Laajennetaan Serverin prototyyppiä EventEmitterin prototyypillä, jotta voitaisiin
// emittoida viestejä.
Server.prototype.__proto__ = EventEmitter.prototype;


Server.prototype.sendData = function (client, player) {
  var reply = new Packet()
    , playerIds = Object.keys(this.players)
    , plr;

  // Lähetetään kaikkien pelaajien tiedot
  for (var i = playerIds.length; i--;) {
    plr = this.players[playerIds[i]];
    // Onko pyydetty nimet
    if (player.sendNames) {
      if (plr.active) {
        reply.putByte(NET.PLAYERNAME);  // Nimet
        reply.putByte(plr.playerId);    // Pelaajan tunnus
        reply.putString(plr.name);      // Nimi
        reply.putByte(plr.zombie);      // Onko botti
        reply.putByte(plr.team);        // Joukkue
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
      if (player.sendNames || visible || plr.health <= 0) {
        // Näkyy
        reply.putByte(NET.PLAYER);    // Pelaajan tietoja
        reply.putByte(plr.playerId);  // Pelaajan tunnus
        reply.putShort(plr.x);        // Sijainti
        reply.putShort(plr.y);        // Sijainti
        reply.putShort(plr.angle);    // Kulma

        // Spawn-protect
        var isProtected = 0;
        if (plr.spawnTime + this.gameState.spawnProtection > timer()) {
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
      } else if (this.gameState.radarArrows || this.gameState.playMode === 2) {
        // Ei näy. Lähetetään tutkatieto. playMode === 2 tarkoittaa TDM-pelimuotoa
        if (player.team === plr.team || this.gameState.radarArrows) {
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
  this.messages.fetch(player.playerId, reply);


  // Jos on pyydetty nimilista niin palautetaan myös kaikkien tavaroiden tiedot
  if (player.sendNames) {
    player.sendNames = false;
    var itemIds = Object.keys(this.items);
    for (var i = itemIds.length; i--;) {
      var item = this.items[itemIds[i]];
      this.messages.add(player.playerId, {
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
};

// Palvelimen versio
Server.VERSION = "v2.4"

/**
 * @namespace Sisältää NetMatch-palvelimen oletusasetukset. Näitä voi muuttaa antamalla
 * {@link Server}-konstruktorille parametrina objektin, jonka avaimet sopivat tämän muotoon.
 */
Server.config = {
  /**
   * GSS-palvelimen osoite
   * @type String
   * @default "http://netmatch.vesq.org"
   */
  regHost: "http://netmatch.vesq.org"
  /**
   * GSS-palvelimella oleva polku gss.php tiedostoon
   * @type String
   * @default "/reg/gss.php"
   */
, regPath: "/reg/gss.php"
  /**
   * Rekisteröidäänkö palvelin
   * @type Boolean
   * @default false
   */
, register: false
  /**
   * Palvelimen kuvaus, näkyy listauksessa
   * @type String
   * @default "Node.js powered server"
   */
, description: "Node.js powered server"
  /**
   * Nykyinen kartta
   * @type String
   * @default "Luna"
   */
, map: "Luna"
  /**
   * Maksimimäärä pelaajia
   * @type Number
   * @default 5
   */
, maxPlayers: 5
  /**
   * Pelimoodi, DM = 1 ja TDM = 2
   * @type Byte
   * @default 1
   */
, gameMode: 1
  /**
   * Kuinka pitkän ajan pelaajilla on suoja spawnauksen jälkeen. Aika millisekunteissa
   * @type Number
   * @default 15000
   */
, spawnProtection: 15000
  /**
   * Ovatko tutkanuolet käytössä vai ei
   * @type Boolean
   * @default true
   */
, radarArrows: true
}

// EVENTTIEN DOKUMENTAATIO
/**
 * NetMatch-palvelin emittoi tämän eventin aina kun palvelimeen tulee dataa. Tätä täytyy käyttää,
 * mikäli haluat saada palvelimen tekemäänkin jotain. Parametrina tämä antaa cbNetwork-noden
 * <a href="http://vesq.github.com/cbNetwork-node/doc/symbols/Client.html">Client</a>-luokan
 * instanssin. Katso alla oleva esimerkki, niin saat tietää lisää:
 * @example
 * // Oletetaan että muuttujaan server on luotu NetMatch-palvelin.
 *
 * server.on('message', function (client) {
 *   // Tulostetaan clientin ID ja osoite cbNetworkin tapaan CoolBasicissa
 *   console.log(client.address + ':' + client.id);
 *
 *   // Lähetetään clientille sen lähettämä data takaisin
 *   client.reply(client.data);
 * });
 *
 * @name Server#message
 * @event
 */
/**
 * Palvelin emittoi tämän eventin, kun sen {@link Server#close}-funktiota kutsutaan.
 * @name Server#closing
 * @event
 */
/**
 * Palvelin emittoi tämän eventin, kun se on sammutettu.
 * @name Server#closed
 * @event
 * @see Server#close
 */

/**
 * Kirjaa pelaajan sisään peliin.
 * @param {Client} client  cbNetworkin Client-luokan jäsen.
 * @returns {Boolean}      Onnistuiko pelaajan liittäminen peliin vai ei.
 */
Server.prototype.login = function (client) {
  var data = client.data
    , replyData
    , version = data.getString()
    , nickname
    , playerIds;

  // Täsmääkö clientin ja serverin versiot
  if (version !== Server.VERSION) {
    // Eivät täsmää, lähetetään virheilmoitus
    replyData = new Packet(3);
    replyData.putByte(NET.LOGIN);
    replyData.putByte(NET.LOGINFAILED);
    replyData.putByte(NET.WRONGVERSION);
    replyData.putString(Server.VERSION);
    client.reply(replyData);
    return false;
  }

  // Versio on OK, luetaan pelaajan nimi
  nickname = data.getString().trim();
  log.info('Player "' + nickname + '" (' + client.address + ') is trying to connect...');

  // Käydään kaikki nimet läpi ettei samaa nimeä vain ole jo suinkin olemassa
  playerIds = Object.keys(this.players);
  for (var i = playerIds.length; i--;) {
    var player = this.players[playerIds[i]];
    if (player.name.toLowerCase() == nickname.toLowerCase()) {
      if (player.kicked || !player.active) {
        player.name = "";
      } else {
        // Nimimerkki oli jo käytössä.
        log.notice('Nickname "' + nickname + '" already in use.');
        replyData = new Packet(3);
        replyData.putByte(NET.LOGIN);
        replyData.putByte(NET.LOGINFAILED);
        replyData.putByte(NET.NICKNAMEINUSE);
        client.reply(replyData);
        return false;
      }
    }
  }

  // Etsitään vapaa "pelipaikka"
  for (var i = playerIds.length; i--;) {
    var player = this.players[playerIds[i]];
    if (this.gameState.playerCount < this.config.maxPlayers && !player.active) {
      // Tyhjä paikka löytyi
      player.clientId = client.id;
      player.active = true;
      player.loggedIn = false;
      player.name = nickname;
      // UNIMPLEMENTED
      player.x = Math.round(-100 + Math.random() * 200);
      player.y = Math.round(-100 + Math.random() * 200);
      player.hackTestX = player.x;
      player.hackTestY = player.y;
      player.angle = Math.floor(Math.random() * 360 + 1);
      player.zombie = false;
      player.health = 100;
      player.kills = 0;
      player.deaths = 0;
      player.weapon = WPN.PISTOL;
      player.lastActivity = new Date().getTime();
      player.spawnTime = player.lastActivity;
      player.admin = false;
      player.kicked = false;
      player.kickReason = "";
      if (this.gameState.gameMode == "TDM") {
        // UNIMPLEMENTED
        // Tasainen jako joukkueihin
        player.team = Math.floor(Math.random()*2 + 1) + 1; // Rand(1,2)
      }

      // Lähetetään vastaus clientille
      replyData = new Packet(16);
      replyData.putByte(NET.LOGIN);
      replyData.putByte(NET.LOGINOK);
      replyData.putByte(player.playerId);
      replyData.putByte(this.gameState.gameMode);
      replyData.putString(this.gameState.map.name);
      replyData.putInt(this.gameState.map.crc32);
      // UNIMPLEMENTED
      replyData.putString(" "); // Kartan URL josta sen voi ladata, mikäli se puuttuu
      client.reply(replyData);
      log.info(player.name + " logged in, assigned ID " + String(player.playerId).magenta);

      // Lisätään viestijonoon ilmoitus uudesta pelaajasta
      var msgData = {
        msgType: NET.LOGIN,
        msgText: nickname,
        playerId: player.playerId,
        playerId2: player.zombie
      };
      for (var j = playerIds.length; j--;) {
        var plr = this.players[playerIds[j]];
        // Lähetetään viesti kaikille muille paitsi boteille ja itselle
        if (plr.active && !plr.zombie && (plr.playerId != player.playerId)) {
          this.messages.add(plr.playerId, msgData);
        }
      }
      return true;
    }
  }

  // Vapaita paikkoja ei ollut
  log.notice('No free slots.');
  replyData = new Packet(3);
  replyData.putByte(NET.LOGIN);
  replyData.putByte(NET.LOGINFAILED);
  replyData.putByte(NET.TOOMANYPLAYERS);
  client.reply(replyData);
  return false;
}

/**
 * Kirjaa pelaajan ulos pelistä.
 * @param {Integer} playerId  Pelaajan ID.
 */
Server.prototype.logout = function (playerId) {
  var player = this.players[playerId]
    , playerIds = Object.keys(this.players);

  player.active = false;
  player.loggedIn = false;
  player.admin = false;
  log.info(player.name + ' logged out.');

  // Lähetetään viesti kaikille muille paitsi boteille
  for (var i = playerIds.length; i--;) {
    var plr = this.players[playerIds[i]];
    // Lähetetään viesti kaikille muille paitsi boteille ja itselle
    if (plr.active && !plr.zombie && (plr.playerId != playerId)) {
      this.messages.add(plr.playerId, { msgType: NET.LOGOUT, playerId: playerId });
    }
  }
}

/**
 * Sammuttaa palvelimen. Emittoi eventit {@link Server#closing} ja {@link Server#closed}
 */
Server.prototype.close = function () {
  if (this.gameState.closing) {
    // Ollaan jo sulkemassa, ei aloiteta samaa prosessia uudelleen.
    return;
  }
  this.emit('closing');
  log.info('Closing server...');
  this.gameState.closing = true;
  var self = this;
  setTimeout(function closeServer() {
    self.server.close();
    log.info('Server closed!');
    self.emit('closed');
  }, 1000);
}

exports = module.exports = Server;

