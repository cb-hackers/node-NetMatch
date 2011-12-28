/**
 * @fileOverview Pitää sisällään {@link NetMatch} nimiavaruuden.
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
  , log = require('./Utils').log
  , colors = require('colors');
/**#nocode-*/

/**
 * Luo uuden palvelimen annettuun porttiin ja osoitteeseen. Kun palvelimeen tulee dataa, emittoi
 * se <i>message</i> eventin, kts. {@link NetMatch#event:message}
 *
 * @class Yleiset NetMatchin funktiot ja ominaisuudet
 *
 * @param {Object} c            Asetukset, kts. {@link NetMatch.config}
 * @param {Number} c.port       Portti, jota palvelin kuuntelee.
 * @param {String} [c.address]  IP-osoite, jota palvelin kuuntelee. Jos tätä ei anneta, järjestelmä
 *                              yrittää kuunnella kaikkia osoitteita.
 */
function NetMatch(c) {
  if('object' !== typeof c || !c.hasOwnProperty('port')) {
    log.fatal("Initialization of NetMatch server failed because of incorrect starting parameters.");
    return false;
  }
  /**
   * cbNetwork-node UDP-palvelin
   * @type cbNetwork.Server
   * @see <a href="http://vesq.github.com/cbNetwork-node/doc/symbols/Server.html">cbNetwork.Server</a>
   */
  this.server = new cbNetwork.Server(c.port, c.address);
  
  var self = this;
  this.server.on('message', function (client) {
    self.emit('message', client);
  });
  
  /**
   * Pelaajille lähetettävät viestit. Tämä on instanssi {@link NetMessages}-luokasta.
   * @see NetMessages
   */
  this.messages = new NetMessages();
  
  /**
   * Asetukset tälle palvelimelle
   * @type Object
   * @see NetMatch.config
   */
  this.config = NetMatch.config;
  
  // Asetetaan nykyisen pelin tila
  this.gameState.playerCount = 0;
  this.gameState.gameMode = this.config.gameMode;
  this.gameState.map = this.config.map;
  this.gameState.mapCRC = -1170754068; // TODO: häx
  this.gameState.maxPlayers = this.config.maxPlayers;
  
  // Nyt alustetaan pelaajat
  this.players = {};
  for(var i = 1; i <= this.config.maxPlayers; ++i) {
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
    
    this.players[i] = pl;
  }
  
  log.info('Server initialized successfully.');
}

// Laajennetaan NetMatchin prototyyppiä EventEmitterin prototyypillä, jotta voitaisiin
// emittoida viestejä.
NetMatch.prototype.__proto__ = EventEmitter.prototype;


// Palvelimen versio
NetMatch.VERSION = "v2.4"

/**
 * @namespace Sisältää NetMatch-palvelimen oletusasetukset. Näitä voi muuttaa antamalla 
 * {@link NetMatch}-konstruktorille parametrina objektin, jonka avaimet sopivat tämän muotoon.
 */
NetMatch.config = {
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

/** Sisältää pelin nykyisestä tilanteesta kertovat muuttujat. */
NetMatch.prototype.gameState = {};


/**
 * Sisältää palvelimen pelaajat, eli luokan {@link Player} jäsenet.
 * Pääset yksittäisen pelaajan dataan näin:
 * @example
 * // Oletetaan että muuttujaan server on luotu NetMatch-palvelin.
 * 
 * // Tulostaa konsoliin ID:n 4 pelaajan nimen.
 * console.log( server.players[4].name );
 */
NetMatch.prototype.players = {};


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
 * @name NetMatch#message
 * @event
 */

// NetMatch.on('message');

NetMatch.prototype.login = function (client) {
  var data = client.data
    , replyData
    , version = data.getString()
    , nickname
    , playerIds;
  
  // Täsmääkö clientin ja serverin versiot
  if (version !== NetMatch.VERSION) {
    // Eivät täsmää, lähetetään virheilmoitus
    replyData = new Packet(3);
    replyData.putByte(NET.LOGIN);
    replyData.putByte(NET.LOGINFAILED);
    replyData.putByte(NET.WRONGVERSION);
    replyData.putString(NetMatch.VERSION);
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
      replyData.putString(this.gameState.map);
      replyData.putInt(this.gameState.mapCRC);
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


NetMatch.prototype.logout = function (client, playerId) {
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

exports = module.exports = NetMatch;

