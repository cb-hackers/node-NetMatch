/**
 * @fileOverview Pitää sisällään {@link Game}-luokan toteutuksen.
 */

/**#nocode+*/
var log = require('./Utils').log
  , colors = require('colors');
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
  this.interval = setInterval(this.update, 1000 / server.gameState.updatesPerSecond, this);
}

/**
 * Pysäyttää pelimekaniikan päivityksen.
 */
Game.prototype.stop = function () {
  clearInterval(this.interval);
}

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
}

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
}

/**
 * Hoitaa bottien tekoälyn.
 * @private
 */
Game.prototype.updateBotsAI = function () {
  var playerIds = Object.keys(this.server.players);
  for (var i = playerIds.length; i--;) {
    var player = this.server.players[playerIds[i]];
    if (!player.zombie) {
      // Jos ei ollut botti niin jatketaan seuraavaan pelaajaan
      continue;
    }
    player.botAI.update();
  }
}

/**
 * Tarkistaa onko erä päättynyt ja hoitaa vastaavat päivitykset, jos on
 * @private
 */
Game.prototype.updateRoundTime = function () {

}

/**
 * Päivittää pelaajien ja joukkueiden statsit, pelaajien määrän yms.
 * @private
 */
Game.prototype.updateStats = function () {

}

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
      }
    }

    // UNIMPLEMENTED
    // Onko pelajaa kartalla
  }
}

/**
 * Poistaa pelaajat, joista ei ole hetkeen kuulunut mitään.
 * @private
 */
Game.prototype.updateTimeouts = function () {

}

/**
 * Pitää bottien lukumäärän oikeana
 * @private
 */
Game.prototype.updateBotsAmount = function () {

}

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
}

/**
 * Palauttaa siirtymän tai kääntymän (pikseliä tai astetta sekunnissa)
 * @param {Number} amount  Pikselimäärä tai astemäärä joka siirrytään/käännytään yhden sekunnin aikana
 * @returns {Number}
 */
Game.prototype.movePerSec = function (amount) {
  return amount * this.frameTime;
}

exports = module.exports = Game;
