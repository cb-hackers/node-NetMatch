/**
 * @fileOverview Pitää sisällään {@link Game}-luokan toteutuksen.
 */

"use strict";

/**#nocode+*/
var log = require('./Utils').log
  , colors = require('colors')
  , NET = require('./Constants').NET
  , DRAW = require('./Constants').DRAW;
/**#nocode-*/

/**
 * Alustaa uuden pelimekaniikasta huolehtivan Game-luokan instanssin.
 * @class Pelimekaniikan päivittämiseen liittyvät toiminnot
 *
 * @param {Server} server  Nykyisen {@link Server}-luokan instanssi
 */
function Game(server) {
  this.server = server;
  this.lastUpdate = 0;
  this.frameTime = 0;
  this.isNextMapLoaded = false;
}

/**
 * Käynnistää palvelimen
 *
 * @param {Number} updatesPerSecond  Kuinka monta kertaa sekunnissa palvelinta päivitetään
 */
Game.prototype.start = function (updatesPerSecond) {
  this.server.gameState.sessionStarted = Date.now();
  this.interval = setInterval(this.update, 1000 / updatesPerSecond, this);
};

/**
 * Pysäyttää pelimekaniikan päivityksen.
 */
Game.prototype.stop = function () {
  clearInterval(this.interval);
};

/**
 * Päivittää pelimekaniikan, mikäli viime päivityksestä on kulunut tarpeeksi aikaa ja
 * pelaajia on palvelimella. Tämän funktion kutsu hoidetaan automaattisesti.
 * @private
 */
Game.prototype.update = function (self) {
  self.updateFrameTimer();
  self.updateBotsAI();
  self.updateRoundTime();
  self.updateStats();
  self.updatePlayers();
  self.updateTimeouts();
  self.updateBotsAmount();
  self.updateBullets();

  self.lastUpdate = Date.now();
};

/**
 * Päivittää vakionopeusajastimen
 * @private
 */
Game.prototype.updateFrameTimer = function () {
  var curTime = Date.now();
  if (!this.lastUpdate) {
    this.lastUpdate = curTime;
  }
  this.frameTime = (curTime - this.lastUpdate) / 1000;
  this.lastUpdate = curTime;
};

/**
 * Käy botit läpi ja kutsuu jokaisen päivitysrutiinia.
 * @private
 */
Game.prototype.updateBotsAI = function () {
  var self = this;
  // Tarkistetaan onko pelaajia pelissä. Jos ei, niin ei päivitetä botteja.
  if (this.server.gameState.playerCount <= 0) {
    return;
  }

  // Onko erä loppu
  if (this.server.gameState.sessionComplete) {
    return;
  }

  // Pyyhitään jokaiselta pelaajalta debuggaukset, jos debugataan.
  if (this.server.debug) {
    this.server.loopPlayers (function (player) {
      if (!player.zombie && player.active && player.loggedIn && !player.debugState) {
        self.server.messages.add(player.id, {
          msgType: NET.DEBUGDRAWING,
          drawType: DRAW.CLEAR
        });
        player.debugState = 1;
      }
    });
  }

  // Päivitetään bottien tekoälyt
  this.server.loopPlayers (function (player) {
    if (player.zombie && player.active && !player.isDead) {
      player.botAI.update();
    }
  });
};

/**
 * Tarkistaa onko erä päättynyt ja hoitaa vastaavat päivitykset, jos on
 * @private
 */
Game.prototype.updateRoundTime = function () {
  var timeLeft, server = this.server;

  // Jos asetuksissa on erän pituus pienempi tai yhtä suuri kuin 0, niin kello ei ole käytössä.
  if (server.config.periodLength <= 0) {
    return;
  }

  // Jos pelaajia ei ole palvelimella niin kello ei käy.
  if (server.gameState.playerCount <= 0) {
    server.gameState.sessionStarted = Date.now();
    return;
  }

  // Lasketaan jäljellä oleva aika
  timeLeft = server.gameState.sessionStarted + server.config.periodLength * 1000 - Date.now();

  if (timeLeft <= 0) {
    server.gameState.sessionComplete = true;

    // Poistetaan kaikki ammukset
    server.bullets = {};

    // Kierrätetään seuraava kartta peliin, jos karttoja on listassa yli yksi, eikä karttaa
    // ole vielä vaihdettu.
    if (!this.isNextMapLoaded && timeLeft < -5000 && server.config.map.length > 1) {
      server.changeMap();
      this.isNextMapLoaded = true;
    }

    // Tapetaan jokainen pelaaja
    server.loopPlayers(function roundEndKill(player) {
      player.health = -10;
      player.timeToDeath = Date.now();
    });
  }

  // Onko erä päättynyt 10 sekuntia sitten
  if (timeLeft < -10000) {
    server.gameState.sessionStarted = Date.now();
    server.gameState.sessionComplete = false;
    this.isNextMapLoaded = false;
    server.loopPlayers(function mapStartLoop(player) {
      player.timeToDeath = Date.now() - server.config.deathDelay * 2;
      player.kills = 0;
      player.deaths = 0;

      // Tarkistetaan onko pelaajalla jo ladattuna sama kartta kuin palvelimella
      if (player.active && !player.zombie && server.config.map.length > 1 && player.mapName !== server.gameState.map.name) {
        // Kartta oli eri.
        log.notice('Player %0 had a map %1 while the server was running map %2',
          player.name.green, player.mapName.green, server.gameState.map.name.green);
        server.logout(player);
      }
    });
  }
};

/**
 * Päivittää pelaajien ja joukkueiden statsit, pelaajien määrän yms.
 * @private
 */
Game.prototype.updateStats = function () {

};

/**
 * Päivittää pelaajat. Hoitaa kuolleista herätykset ja sen etteivät pelaajat ole kartan sisällä.
 * @private
 */
Game.prototype.updatePlayers = function () {
  var playerIds = Object.keys(this.server.players);
  for (var i = playerIds.length; i--;) {
    var player = this.server.players[playerIds[i]];

    // Jos pelaaja on kuollut ja kuolemasta on kulunut tarpeeksi aikaa, herätetään henkiin.
    if (player.health <= 0 && player.timeToDeath + this.server.config.deathDelay < Date.now()) {
      if (this.server.debug) {
        log.write('Reviving %0 from the deads.', player.name.green);
      }
      var randomPlace = this.server.gameState.map.findSpot();
      player.x = randomPlace.x;
      player.y = randomPlace.y;
      player.health = 100;
      player.lastValidX = player.x;
      player.lastValidY = player.y;
      player.hackTestX = player.x;
      player.hackTestY = player.y;
      player.spawnTime = Date.now();
      if (player.zombie) {
        player.isDead = false;
        player.weapon = this.server.getBotWeapon();
        if (this.server.gameState.gameMode === 3) {
          // Zombie-moodi, boteilla on vain 10hp eivätkä ne ole koskaan nakkeja
          player.health = 10;
          player.spawnTime = 0;
        }
      }
    }

    // UNIMPLEMENTED
    // Onko pelajaa kartalla
  }
};

/**
 * Poistaa pelaajat, joista ei ole hetkeen kuulunut mitään.
 * @private
 */
Game.prototype.updateTimeouts = function () {
  var server = this.server;

  server.loopPlayers( function (player) {
    if ((!player.active && !player.loggedIn) || player.zombie) {
      // Pelaaja ei ole aktiivinen eikä sisäänkirjautunut taikka pelaaja on botti, joten
      // ei tarkisteta tältä timeouttia.
      return;
    }
    if (player.lastActivity + server.config.maxInactiveTime < Date.now()) {
      // Timeout tuli, poistetaan pelaaja.
      player.active = false;
      player.loggedIn = false;
      player.admin = false;
      log.info('%0 timed out.', player.name.green);

      server.gameState.playerCount--;

      // Päivitetään tiedot servulistaukseen
      server.registration.update();

      // Kerrotaan siitä muillekin
      server.messages.addToAll({ msgType: NET.LOGOUT, player: player });
    }
  });
};

/**
 * Pitää bottien lukumäärän oikeana
 * @private
 */
Game.prototype.updateBotsAmount = function () {

};

/**
 * Hoitaa ammusten siirtelyn, osumisen ja poistamisen.
 * @private
 */
Game.prototype.updateBullets = function () {
  var bulletIds = Object.keys(this.server.bullets)
    , bullet;

  // Käydään kaikki ammukset läpi
  for (var i = bulletIds.length; i--;) {
    bullet = this.server.bullets[bulletIds[i]];
    bullet.update();
  }
};

/**
 * Palauttaa siirtymän tai kääntymän (pikseliä tai astetta sekunnissa)
 * @param {Number} amount  Pikselimäärä tai astemäärä joka siirrytään/käännytään yhden sekunnin aikana
 * @returns {Number}
 */
Game.prototype.movePerSec = function (amount) {
  return amount * this.frameTime;
};

module.exports = Game;
