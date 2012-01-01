/**
 * @fileOverview Pitää sisällään {@link Server} nimiavaruuden.
 */

/**#nocode+*/
var cbNetwork = require('cbNetwork')
  , Packet = cbNetwork.Packet
  // Vakiot
  , NET = require('./Constants').NET
  , WPN = require('./Constants').WPN
  , ITM = require('./Constants').ITM
  // Helpperit
  , log    = require('./Utils').log
  , timer  = require('./Utils').timer
  , colors = require('colors')
  // Serverin moduulit
  , NetMsgs  = require('./NetMessage')
  , Player   = require('./Player')
  , Map      = require('./Map').Map
  , Input    = require('./Input')
  , Item     = require('./Item')
  , Game     = require('./Game')
  , Config   = require('./Config')
  , Commands = require('./Command');
/**#nocode-*/

Server.VERSION = "v2.4";

/**
 * Luo uuden palvelimen annettuun porttiin ja osoitteeseen. Kun palvelimeen tulee dataa, emittoi
 * se siihen kuuluvan eventin paketin ensimmäisen tavun perusteella. esim. NET.LOGIN
 *
 * @class Yleiset Serverin funktiot ja ominaisuudet
 *
 * @param {Number} port            Portti, jota palvelin kuuntelee.
 * @param {String} [address]       IP-osoite, jota palvelin kuuntelee. Jos tätä ei anneta, järjestelmä
 *                                 yrittää kuunnella kaikkia osoitteita (0.0.0.0).
 * @param {Boolean} [debug=false]  Spämmitäänkö konsoliin paljon "turhaa" tietoa?
 */
function Server(port, address, debug) {
  if (this.debug = debug) { log.notice('Server running on debug mode, expect spam!'.red); }
  /**
   * cbNetwork-node UDP-palvelin
   * @type cbNetwork.Server
   * @see <a href="http://vesq.github.com/cbNetwork-node/doc/symbols/Server.html">cbNetwork.Server</a>
   */
  this.server = new cbNetwork.Server(port, address);

  /** Sisältää pelin nykyisestä tilanteesta kertovat muuttujat. */
  this.gameState = {};

  /** Sisältää kaikki kartat */
  this.maps = {};

  /** Sisältää palvelimen pelaajat, eli luokan {@link Player} jäsenet. */
  this.players = {};

  /** Sisältää palvelimen ammukset, eli luokan {@link Weapon} jäsenet. */
  this.bullets = [];
  /** @private */
  this.lastBulletId = 0;

  /** Sisältää palvelimella maassa olevat tavarat, kts. {@link Item}. */
  this.items = {};

  // Alustetaan moduulit

  /**
   * Pelaajille lähetettävät viestit. Tämä on instanssi {@link NetMessages}-luokasta.
   * @type NetMessages
   */
  this.messages = new NetMsgs(this);

  /**
   * Asetukset tälle palvelimelle
   * @type Config
   */
  this.config = new Config(this);

  /**
   * Sisältää palvelimella pyörivän {@link Game}-luokan instanssin
   * @type Game
   */
  this.game = new Game(this);

  /**
   * Sisältää palvelimen komennot, joita voidaan kutsua joko palvelimen konsolista tai klientiltä
   * @type Input
   */
  this.commands = new Commands(this);

  /**
   * Sisältää palvelimen konsoli-io:n käsittelyyn käytettävän {@link Input}-luokan instanssin
   * @type Input
   */
  this.input = new Input(this);

  // Alustetaan palvelin (esim. kartta, pelaajat, tavarat)
  this.initialize();

  log.info('Server initialized successfully. :O)');
}

Server.prototype.__proto__ = process.EventEmitter.prototype;

/** Alustaa palvelimen */
Server.prototype.initialize = function () {
  // Kuunnellaan klinuja
  var self = this;
  this.server.on('message', function recvMsg(client) {
    self.handlePacket(client);
  });

  this.server.on('close', function onClose() {
    if (!self.gameState.closing) {
      // Hups! cbNetwork serveri kaatui alta.
      log.fatal('cbNetwork kohtasi odottamattoman virheen.');
      self.close(true);
    }
    // Muussa tapauksessa sulkeutuminen oli odotettavissa
  });

  // Alustetaan pelitilanne
  this.gameState.playerCount = 0;
  this.gameState.gameMode = this.config.gameMode;
  this.gameState.maxPlayers = this.config.maxPlayers;

  // Ladataan kartta
  this.gameState.map = new Map(this, this.config.map);
  if (!this.gameState.map.loaded) {
    log.fatal('Could not load map "%0"', this.config.map);
    this.close();
    return;
  }

  // UNIMPLEMENTED Mappien rotaatio
  this.maps[this.gameState.map.name] = this.gameState.map;

  // Alustetaan pelaajat
  for (var i = 1; i <= this.config.maxPlayers; ++i) {
    var pl = new Player();
    pl.playerId = i;
    pl.team = 1;
    pl.botName = this.gameState.map.config.botNames[i];
    pl.clientId = "";
    pl.name = "";
    var skill = 21 - pl.playerId; // Botteja hieman eritasoisiksi vissiinkin?
    pl.fightRotate = 1.5 + (skill / 1.5);
    pl.shootingAngle = 4.0 + (pl.playerId * 1.5);
    pl.fov = 100 + (skill * 3.5);
    pl.kickReason = "";
    this.players[i] = pl;
  }

  // Alustetaan itemit
  var mapConfig = this.gameState.map.config;
  var itemId = 0;
  for (var i = mapConfig.healthItems - 1; i--;) {
    new Item(this, ++itemId, ITM.HEALTH);
  }
  for (var i = mapConfig.mgunItems - 1; i--;) {
    new Item(this, ++itemId, ITM.AMMO);
  }
  for (var i = mapConfig.bazookaItems - 1; i--;) {
    new Item(this, ++itemId, ITM.ROCKET);
  }
  for (var i = mapConfig.shotgunItems - 1; i--;) {
    new Item(this, ++itemId, ITM.FUEL);
  }
  for (var i = mapConfig.launcherItems - 1; i--;) {
    new Item(this, ++itemId, ITM.SHOTGUN);
  }
  for (var i = mapConfig.chainsawItems - 1; i--;) {
    new Item(this, ++itemId, ITM.LAUNCHER);
  }
};

/**
 * Hoitaa saapuneiden viestien käsittelyn.
 *
 * @param {cbNetwork.Client}  cbNetwork-noden Client-luokan instanssi, jolta dataa tulee.
 * @see <a href="http://vesq.github.com/cbNetwork-node/doc/symbols/Client.html">cbNetwork.Client</a>
 */
Server.prototype.handlePacket = function (client) {
  var data = client.data
    , msgType = data.getByte()
    , currentPlayerId;

  // Onko servu sammumassa?
  if (this.gameState.closing) {
    reply = new Packet(2);
    reply.putByte(NET.SERVERCLOSING);
    reply.putByte(NET.END);
    client.reply(reply);
    return;
  }

  if (msgType === NET.LOGIN) {
    // Login paketissa ei ole pelaajan ID:tä vielä, joten se on käsiteltävä erikseen
    this.emit(NET.LOGIN, client);
    return;
  }

  // Luetaan lähetetty pelaajan ID, joka on pelaajan järjestysnumero ja aina väliltä 1...MAX_PLAYERS
  currentPlayerId = data.getByte();
  // Tai jos ei ole niin sitten ei päästetä sisään >:(
  if (currentPlayerId < 1 || currentPlayerId > this.gameState.maxPlayers) {
    log.notice('Possible hack attempt from ' + client.address + ' Invalid player ID (' + currentPlayerId + ')');
    return;
  }

  // Haetaan pelaajan instanssi Player-luokasta
  player = this.players[currentPlayerId];

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
    this.emit(NET.LOGOUT, client, currentPlayerId);
    return;
  }

  // Lasketaan pelaajan ja serverin välinen lagi
  player.lag = timer() - player.lastActivity;
  // Päivitetään pelaajan olemassaolo
  player.lastActivity = timer();

  // Luupataan kaikkien pakettien läpi
  while (msgType) {
    // Lähetetään tietoa paketista käsiteltäväksi
    this.emit(msgType, client, player);
    msgType = data.getByte();
  }

  // Lähetetään dataa pelaajalle
  this.sendReply(client, player);

  // Valmis! :)
};

/**
 * Hoitaa datan lähetyksen.
 *
 * @param {cbNetwork.Client} client  cbNetworkin Client-luokan instanssi
 * @param {Player} player            Pelaaja, keneltä on saatu dataa ja kenelle lähetetään vastaus tässä.
 * @see <a href="http://vesq.github.com/cbNetwork-node/doc/symbols/Client.html">cbNetwork.Client</a>
 */
Server.prototype.sendReply = function (client, player) {
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
      var x1 = player.x
        , y1 = player.y
        , x2 = plr.x
        , y2 = plr.y
        , visible = !((Math.abs(x1 - x2) > 450) || (Math.abs(y1 - y2) > 350));

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

/**
 * Kirjaa pelaajan sisään peliin.
 * @param {cbNetwork.Client} client  cbNetworkin Client-luokan jäsen.
 * @returns {Boolean}                Onnistuiko pelaajan liittäminen peliin vai ei.
 * @see <a href="http://vesq.github.com/cbNetwork-node/doc/symbols/Client.html">cbNetwork.Client</a>
 */
Server.prototype.login = function (client) {
  var data = client.data
    , version = data.getString()
    , replyData
    , nickname
    , playerIds
    , randomPlace;

  // Täsmääkö clientin ja serverin versiot
  if (version !== Server.VERSION) {
    log.notice('Player trying to connect with incorrect client version.');
    replyData = new Packet(3);
    replyData.putByte(NET.LOGIN);
    replyData.putByte(NET.LOGINFAILED);
    replyData.putByte(NET.WRONGVERSION);
    replyData.putString(Server.VERSION);
    client.reply(replyData);
    return;
  }

  // Versio on OK, luetaan pelaajan nimi
  nickname = data.getString().trim();
  log.info('Player "%0" is trying to login...', nickname.green);

  // Käydään kaikki nimet läpi ettei samaa nimeä vain ole jo suinkin olemassa
  playerIds = Object.keys(this.players);
  for (var i = playerIds.length; i--;) {
    var player = this.players[playerIds[i]];
    if (player.name.toLowerCase() === nickname.toLowerCase()) {
      if (player.kicked || !player.active) {
        player.name = "";
      } else {
        // Nimimerkki oli jo käytössä.
        log.info(' -> Nickname "%0" already in use.', nickname.green);
        replyData = new Packet(3);
        replyData.putByte(NET.LOGIN);
        replyData.putByte(NET.LOGINFAILED);
        replyData.putByte(NET.NICKNAMEINUSE);
        client.reply(replyData);
        return;
      }
    }
  }

  // Etsitään inaktiivinen pelaaja
  for (var i = playerIds.length; i--;) {
    var player = this.players[playerIds[i]];
    if (this.gameState.playerCount < this.config.maxPlayers && !player.active) {
      // Tyhjä paikka löytyi
      player.clientId = client.id;
      player.active = true;
      player.loggedIn = false;
      player.name = nickname;
      randomPlace = this.gameState.map.findSpot();
      player.x = randomPlace.x;
      player.y = randomPlace.y;
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
      if (this.gameState.gameMode === 2) {
        // UNIMPLEMENTED
        // Tasainen jako joukkueihin TDM-pelimoodissa
        player.team = Math.floor(Math.random() * 2 + 1) + 1; // Rand(1,2)
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
      log.info(' -> login successful, assigned ID (%0)', String(player.playerId).magenta);

      // Lisätään viestijonoon ilmoitus uudesta pelaajasta, kaikille muille paitsi boteille ja itselle.
      this.messages.addToAll({
        msgType: NET.LOGIN,
        msgText: nickname,
        playerId: player.playerId,
        playerId2: player.zombie
      }, player.playerId);
      return;
    }
  }

  // Vapaita paikkoja ei ollut
  log.info(' -> Server is full!');
  replyData = new Packet(3);
  replyData.putByte(NET.LOGIN);
  replyData.putByte(NET.LOGINFAILED);
  replyData.putByte(NET.TOOMANYPLAYERS);
  client.reply(replyData);
  return;
};

/**
 * Kirjaa pelaajan ulos pelistä.
 * @param {Integer} playerId  Pelaajan ID
 */
Server.prototype.logout = function (playerId) {
  var player = this.players[playerId]
    , playerIds = Object.keys(this.players);

  player.active = false;
  player.loggedIn = false;
  player.admin = false;
  log.info('"%0" logged out.', player.name.green);

  // Lähetetään viesti kaikille muille paitsi boteille ja itselle
  this.messages.addToAll({msgType: NET.LOGOUT, playerId: playerId}, playerId);
}

/** 
 * Palvelimelta potkaiseminen
 * 
 * @param {Integer} playerId    Pelaajan ID
 * @param {Integer} kickerId    Potkijan ID
 * @param {String} [reason=""]  Potkujen syy
 */
Server.prototype.kickPlayer = function (playerId, kickerId, reason) {
  log.info(playerId);
  var player = this.players[playerId];
  player.kicked = true,
  player.kickReason = reason || '';
  player.kickerId = kickerId;
  player.loggedIn = false;
  player.active = false;
  player.admin = false;
  // Lähetään viesti kaikille
  this.messages.addToAll({
    msgType: NET.KICKED,
    playerId: playerId,
    playerId2: kickerId,
    msgText: reason
  });
}


/**
 * Sammuttaa palvelimen. Emittoi eventit {@link Server#closing} ja {@link Server#closed}
 */
Server.prototype.close = function (now) {
  if (this.gameState.closing) {
    // Ollaan jo sulkemassa, ei aloiteta samaa prosessia uudelleen.
    return;
  }
  this.gameState.closing = true;
  log.info('Server going down...');
  this.emit('closing');

  // Pysäytetään Game-moduulin päivitys
  this.game.stop();

  var self = this;
  setTimeout(function closeServer() {
    self.server.close();
    self.emit('closed');
    process.exit();
  }, now ? 0 : 1000);
};

// Tapahtumien dokumentaatio
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

module.exports = Server;
