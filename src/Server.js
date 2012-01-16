/**
 * @fileOverview Pitää sisällään {@link Server} nimiavaruuden.
 */

"use strict";

/**#nocode+*/
var cbNetwork = require('cbNetwork')
  , Packet = cbNetwork.Packet
  // Vakiot
  , NET = require('./Constants').NET
  , WPN = require('./Constants').WPN
  , ITM = require('./Constants').ITM
  // Helpperit
  , log    = require('./Utils').log
  , rand   = require('./Utils').rand
  , colors = require('colors')
  , util   = require('util')
  , events = require('events')
  // Serverin moduulit
  , NetMsgs      = require('./NetMessage')
  , Player       = require('./Player')
  , Map          = require('./Map')
  , Input        = require('./Input')
  , Item         = require('./Item')
  , Game         = require('./Game')
  , Config       = require('./Config')
  , Command      = require('./Command')
  , Registration = require('./Registration')
  , BotAI        = require('./BotAI')
  , Bullet       = require('./Bullet');
/**#nocode-*/


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
function Server(args, version) {
  /** Palvelimen debug-tila */
  this.debug = args.d;

  if (this.debug) { log.notice('Server running on debug mode, expect spam!'.red); }

  /**
   * Palvelimen versio
   * @const
  */
  this.VERSION = version;

  /** Sisältää pelin nykyisestä tilanteesta kertovat muuttujat. */
  this.gameState = {};

  /** Sisältää kaikki kartat */
  this.maps = {};

  /** Sisältää palvelimen pelaajat, eli luokan {@link Player} jäsenet. */
  this.players = {};

  /** Sisältää palvelimen ammukset, eli luokan {@link Bullet} jäsenet. */
  this.bullets = {};
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
   * @type Commands
   */
  this.commands = new Command(this);

  /**
   * Sisältää palvelimen konsoli-io:n käsittelyyn käytettävän {@link Input}-luokan instanssin
   * @type Input
   */
  this.input = new Input(this);

  /**
   * Tämän palvelimen palvelinlistaukseen liittyvä toiminallisuus
   * @type Registration
   */
  this.registration = new Registration(this);

  // Alustetaan palvelin (esim. kartta, pelaajat, tavarat)
  if (this.initialize(args.p, args.a, args.c)) {
    log.info('Server initialized successfully.');
  } else {
    log.fatal('Server initialization failed!');
    if ('undefined' === typeof this.server) {
      // cbNetworkkia ei keretty alustaa
      this.close(true);
    } else {
      this.close();
    }
  }
}

util.inherits(Server, events.EventEmitter);

/** Alustaa palvelimen */
Server.prototype.initialize = function (port, address, config) {
  var self = this;

  // Ladataan konffit
  if (!this.config.load(config)) { return false; }
  // Komentoriviparametrit voittaa.
  if (port) { this.config.port = port; }
  if (address) { this.config.address = address; }

  /**
   * cbNetwork-node UDP-palvelin
   * @type cbNetwork.Server
   * @see <a href="http://vesq.github.com/cbNetwork-node/doc/symbols/Server.html">cbNetwork.Server</a>
   */
  this.server = new cbNetwork.Server(this.config.port, this.config.address);

  this.server.on('message', function recvMsg(client) {
    self.handlePacket(client);
  });

  this.server.on('close', function onClose() {
    if (!self.gameState.closing) {
      // Hups! cbNetwork serveri kaatui alta.
      log.fatal('cbNetwork unexpectedly closed, server will terminate.');
      self.close(true);
    }
    // Muussa tapauksessa sulkeutuminen oli odotettavissa
  });

  // Alustetaan pelitilanne
  this.gameState.playerCount = 0;
  this.gameState.botCount = this.config.botCount;
  this.gameState.gameMode = this.config.gameMode;
  this.gameState.maxPlayers = this.config.maxPlayers;
  this.gameState.radarArrows = this.config.radarArrows;

  // Ladataan kartta
  this.gameState.map = new Map(this, this.config.map);
  if (!this.gameState.map.loaded) {
    // Kartan lataus epäonnistui
    log.fatal('Could not load map "%0"', this.config.map);
    return false;
  }

  // Jos kartalla on botCount-asetus, asetetaan se botCountiksi, mikäli nykyinen on < 0
  if ('number' === typeof this.gameState.map.config.botCount && this.gameState.botCount < 0) {
    this.gameState.botCount = this.gameState.map.config.botCount;
  }

  // UNIMPLEMENTED Mappien rotaatio
  this.maps[this.gameState.map.name] = this.gameState.map;

  // Alustetaan pelaajat
  for (var i = 1; i <= 64; ++i) {
    this.players[i] = new Player(this, i);
  }

  // Alustetaan botit
  this.initBots();

  // Lisätäänkö palvelin palvelinlistaukseen
  if (this.config.register) {
    this.registration.apply(function initRegister(e) {
      if (e) { log.error(e); }
      else   { log.info('Server registered successfully.'); }
    });
  }

  // Käynnistetään pelimekaniikka, joka päivittyy configeissa määriteltyyn tahtiin.
  this.game.start(this.config.updatesPerSec);

  return true;
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
    , currentPlayerId
    , reply
    , player;

  // Registeröinniltä paketti
  if (client.data.clientId === 544437095) {
    if (String(client.data.memBlock.slice(4)) === 'GSS+') {
      this.emit('register', client.data);
    } else if (String(client.data.memBlock.slice(4)) === 'PING') {
      reply = new Packet(4);
      reply.putString('PONG');
      client.reply(reply);
    }
    return;
  }

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
    if (player.kicker) {
      reply.putByte(player.kicker.id);
    } else {
      // Palvelin potkaisi
      reply.putByte(0);
    }
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
    this.emit(NET.LOGOUT, client, player);
    return;
  }

  // Lasketaan pelaajan ja serverin välinen lagi
  player.lag = Date.now() - player.lastActivity;
  // Päivitetään pelaajan olemassaolo
  player.lastActivity = Date.now();

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
    , plr
    , server = this;

  // Lähetetään kaikkien pelaajien tiedot
  this.loopPlayers(function (plr) {
    // Onko pyydetty nimet
    if (player.sendNames) {
      if (plr.active) {
        reply.putByte(NET.PLAYERNAME);  // Nimet
        reply.putByte(plr.id);          // Pelaajan tunnus
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
        , visible = !((Math.abs(x1 - x2) > 450*2) || (Math.abs(y1 - y2) > 350*2));

      // Onko näkyvissä vai voidaanko muuten lähettää
      if (player.sendNames || visible || plr.health <= 0) {
        // Näkyy
        reply.putByte(NET.PLAYER); // Pelaajan tietoja
        reply.putByte(plr.id);     // Pelaajan tunnus
        reply.putShort(plr.x);     // Sijainti
        reply.putShort(plr.y);     // Sijainti
        reply.putShort(plr.angle); // Kulma

        // Spawn-protect
        var isProtected = 0;
        if (plr.spawnTime + server.config.spawnProtection > Date.now()) {
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

        if (plr.health <= 0) {
          // Client-puolella health-arvo lasketaan seuraavasta tavusta niin, että jos se ylittää
          // 128, on oikea health-määrä vastaanotettu tavu - 256.
          reply.putByte(Math.min(255, Math.max(0, plr.health + 256)));
        } else {
          reply.putByte(plr.health);      // Terveys
        }
        reply.putShort(plr.kills);      // Tapot
        reply.putShort(plr.deaths);     // Kuolemat
      } else if (server.gameState.radarArrows || server.gameState.playMode === 2) {
        // Ei näy. Lähetetään tutkatieto. playMode === 2 tarkoittaa TDM-pelimuotoa
        if (player.team === plr.team || server.gameState.radarArrows) {
          // Lähetetään tutkatiedot jos joukkueet ovat samat tai asetuksista on laitettu että
          // kaikkien joukkueiden pelaajien tutkatiedot lähetetään
          reply.putByte(NET.RADAR); // Tutkatietoa tulossa
          var angle = Math.atan2(y1 - y2, x1 - x2) + Math.PI; // Kulma radiaaneina välillä 0...2pi
          reply.putByte((angle / (2 * Math.PI)) * 255); // Kulma muutettuna välille 0-255
          reply.putByte(plr.team);  // Pelaajan joukkue
        }
      }
    }
  });

  // UNIMPLEMENTED
  // Kartan vaihtaminen

  // Lähetetään kaikki pelaajalle osoitetut viestit
  this.messages.fetch(player, reply);


  // Jos on pyydetty nimilista niin palautetaan myös kaikkien tavaroiden tiedot
  if (player.sendNames) {
    player.sendNames = false;
    var itemIds = Object.keys(this.items);
    for (var i = itemIds.length; i--;) {
      var item = this.items[itemIds[i]];
      this.messages.add(player.id, {
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
  player.debugState = 0;

  reply.putByte(NET.END);
  client.reply(reply);

  // Dodiin, valmiita ollaan :)
  return;
};

/**
 * Lähettää NET.SERVERMESSAGE viestin pelaajille. Jos player-parametri on annettu,
 * lähetetään viesti vain kyseiselle pelaajalle.
 *
 * @param {String} msg       Viesti, joka lähetetään
 * @param {Player} [player]  Yksityisviestin saava pelaaja
 */
Server.prototype.serverMessage = function (msg, player) {

  if (!player) {
    log.write('<Server>'.blue + ' %0', msg);
    this.messages.addToAll({
      msgType: NET.SERVERMSG,
      msgText: msg
    });
  } else {
    log.write('<Server @%0>'.blue + ' %1', player.name, msg);
    this.messages.add(player.id, {
      msgType: NET.SERVERMSG,
      msgText: msg
    });
  }
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
    , randomPlace
    , player
    , teamCheckLoop, reds = 0, greens = 0;

  // Täsmääkö clientin ja serverin versiot
  if (version !== this.VERSION) {
    log.notice('Player trying to connect with incorrect client version.');
    replyData = new Packet(3);
    replyData.putByte(NET.LOGIN);
    replyData.putByte(NET.LOGINFAILED);
    replyData.putByte(NET.WRONGVERSION);
    replyData.putString(this.VERSION);
    client.reply(replyData);
    return;
  }

  // Versio on OK, luetaan pelaajan nimi
  nickname = data.getString().trim();
  log.info('Player %0 is trying to login...', nickname.green);

  // Käydään kaikki nimet läpi ettei samaa nimeä vain ole jo suinkin olemassa
  playerIds = Object.keys(this.players);
  for (var i = 0; i < playerIds.length; i++) {
    player = this.players[playerIds[i]];
    if (player.name.toLowerCase() === nickname.toLowerCase()) {
      if (player.kicked || !player.active) {
        player.name = "";
      } else {
        // Nimimerkki oli jo käytössä.
        log.info(' -> Nickname %0 already in use.', nickname.green);
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
  for (i = 0; i < playerIds.length; i++) {
    player = this.players[playerIds[i]];
    if (this.gameState.playerCount < this.config.maxPlayers && !player.active) {
      // Tyhjä paikka löytyi
      player.clientId = client.id;
      if (this.gameState.gameMode > 1) {
        // Tasainen jako joukkueihin TDM-pelimoodissa
        this.loopPlayers(function (plr) {
          if (!plr.loggedIn) { return; }
          if (plr.team === 1) {
            greens++;
          } else {
            reds++;
          }
        });
        if (greens > reds) {
          log.info(' -> Assigned to reds');
          player.team = 2;
        } else if (reds > greens) {
          log.info(' -> Assigned to greens');
          player.team = 1;
        } else {
          player.team = rand(1, 2);
          log.info(' -> Assigned randomly to %0', (player.team === 1) ? 'greens' : 'reds');
        }
      }
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
      this.gameState.playerCount++;

      // Lähetetään vastaus clientille
      replyData = new Packet(16);
      replyData.putByte(NET.LOGIN);
      replyData.putByte(NET.LOGINOK);
      replyData.putByte(player.id);
      replyData.putByte(this.gameState.gameMode);
      replyData.putString(this.gameState.map.name);
      replyData.putInt(this.gameState.map.crc32);
      // UNIMPLEMENTED
      replyData.putString(" "); // Kartan URL josta sen voi ladata, mikäli se puuttuu
      client.reply(replyData);
      log.info(' -> login successful, assigned ID (%0)', String(player.id).magenta);

      // Päivitetään tiedot servulistaukseen
      this.registration.update();

      // Lisätään viestijonoon ilmoitus uudesta pelaajasta, kaikille muille paitsi boteille ja itselle.
      this.messages.addToAll({
        msgType: NET.LOGIN,
        msgText: nickname,
        player: player
      }, player.id);
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
 * @param {Player} player  Pelaaja joka kirjataan ulos
 */
Server.prototype.logout = function (player) {
  player.active = false;
  player.loggedIn = false;
  player.admin = false;
  log.info('%0 logged out.', player.name.green);
  this.gameState.playerCount--;

  // Päivitetään tiedot servulistaukseen
  this.registration.update();

  // Lähetetään viesti kaikille muille paitsi boteille ja itselle
  this.messages.addToAll({msgType: NET.LOGOUT, player: player}, player.id);
};

/**
 * Palvelimelta potkaiseminen
 *
 * @param {Player} player       Pelaaja, joka potkitaan
 * @param {Player} kicker       Potkaisija
 * @param {String} [reason=""]  Potkujen syy
 */
Server.prototype.kickPlayer = function (player, kicker, reason) {
  player.kicked = true;
  player.kickReason = reason || '';
  player.kicker = kicker;
  player.loggedIn = false;
  player.active = false;
  player.admin = false;
  this.gameState.playerCount--;
  // Lähetään viesti kaikille
  this.messages.addToAll({
    msgType: NET.KICKED,
    player: player,
    player2: kicker,
    msgText: reason
  });
};

/**
 * Etsii pelaajan nimen perusteella
 *
 * @param {String} name  Pelaajan nimimerkki
 * @return {Player}  Haluttu pelaaja
 */
Server.prototype.getPlayer = function (name) {
  var playerIds = Object.keys(this.players), plr;
  for (var i = playerIds.length; i--;) {
    plr = this.players[playerIds[i]];
    if (plr.name === name && !plr.zombie) {
      return plr;
    }
  }
};

/**
 * Käy kaikki pelaajat läpi ja kutsuu callbackia jokaisen pelaajan kohdalla. Callback saa
 * parametrikseen {@link Player}-luokan instanssin.
 *
 * @param {Function} callback  Funktio jota kutsutaan jokaisen pelaajan kohdalla
 */
Server.prototype.loopPlayers = function (callback) {
  var playerIds = Object.keys(this.players), plr;
  for (var i = 0; i < playerIds.length; i++) {
    callback(this.players[playerIds[i]]);
  }
};

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

  // Pyydetään, että palvelin poistetaan listauksesta
  if (this.registration.registered) {
    log.info('Unregistering server...');
    this.registration.remove(function (e) {
      if (e) { log.error(e); }
      else   { log.info('Server unregistered.'); }
    });
  }

  var self = this;
  setTimeout(function closeServer() {
    if (self.server) {
      self.server.close();
    }
    self.emit('closed');
    process.exit();
  }, now ? 0 : 1000);
};

/**
 * Alustaa botit.
 */
Server.prototype.initBots = function () {
  var count = this.gameState.botCount
    , bot
    , team = rand(1, 2)
    , map = this.gameState.map
    , randomPlace;

  for (var i = 1; i <= count; i++) {
    bot = this.players[i];
    bot.clientId  = 'bot:' + i;
    bot.name      = bot.botName;
    bot.zombie    = true;
    bot.active    = true;
    bot.loggedIn  = true;
    bot.isDead    = false;
    bot.health    = 100;
    bot.kills     = 0;
    bot.deaths    = 0;
    bot.weapon    = this.getBotWeapon();
    randomPlace = map.findSpot();
    bot.x = randomPlace.x;
    bot.y = randomPlace.y;
    bot.angle = rand(0, 360);
    if (this.gameState.gameMode > 1) {
      bot.team = team;
      team++;
      if (team > 2) { team = 1; }
    } else {
      bot.team = 1;
    }

    // Luodaan botille tekoäly ja asetetaan sen taitotaso samaksi kuin pelaaja-ID
    bot.botAI = new BotAI(this, bot);
    bot.botAI.setSkill(i);
  }
};

/**
 * Arpoo aseen boteille sallittujen listalta.
 */
Server.prototype.getBotWeapon = function () {
  var weapons;

  if (this.config.botWeapons && this.config.botWeapons.length > 0) {
    weapons = this.config.botWeapons;
  } else if ('undefined' === this.gameState.map.config.botWeapons) {
    weapons = [1, 2, 3, 4, 5, 6];
  } else {
    weapons = this.gameState.map.config.botWeapons;
  }
  return weapons[rand(0, weapons.length - 1)];
};

/**
 * Luo uuden ammuksen.
 *
 * @param {Player} player  Pelaaja joka ampui ammuksen
 */
Server.prototype.createBullet = function (player) {
  var bullet, bulletAmount;

  if ('undefined' === typeof player) {
    log.error("Tried to create a bullet for an undefined player!");
    return;
  }

  switch (player.weapon) {
    case WPN.LAUNCHER:
      // Kranaatinheittimestä lähtee kaksi ammusta
      bulletAmount = 2;
      break;
    case WPN.SHOTGUN:
      // Haulikosta lähtee kuusi ammusta
      bulletAmount = 6;
      break;
    default:
      // Oletuksena ammutaan vain yksi kuti
      bulletAmount = 1;
  }

  for (var i = 1; i <= bulletAmount; i++) {
    if (player.weapon === WPN.LAUNCHER && i === 2) {
      // Toinen ammus kranaatinlaukaisimesta lähtee peilattuna
      bullet = new Bullet(this, player, ++this.lastBulletId, true);
    } else {
      bullet = new Bullet(this, player, ++this.lastBulletId);
    }
    if (!bullet.failed && bullet.initialize()) {
      // Jos ammuksen alustus onnistui (esim. ei ammuttu seinän sisällä), lisätään se listaan.
      this.bullets[bullet.id] = bullet;
      // Lisätään ammusviesti lähetettäväksi jokaiselle pelaajalle
      this.messages.addToAll({
        msgType: NET.NEWBULLET,          // Viestin tyyppi
        bullet: bullet,                  // Ammus
        sndPlay: (i === 1),              // Ääni toistetaan vain ensimmäisen luodin kohdalla
        weapon: player.weapon,           // Millä aseella ammuttiin
        player: player,                  // Kuka ampui
        x: bullet.x,                     // Mistä ammus lähti
        y: bullet.y,                     // Mistä ammus lähti
        handShooted: player.handShooted  // Kummalla kädellä ammuttiin (pistooli)
      });
    } else {
      // Ammuksen luonti epäonnistui
      this.lastBulletId--;
      log.debug('Failed to initialize a new bullet shot by %0', player.name.green);
    }
  }
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
