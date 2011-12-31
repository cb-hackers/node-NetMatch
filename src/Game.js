/**
 * @fileOverview Pitää sisällään {@link Game}-luokan toteutuksen.
 */

/**#nocode+*/
var log = require('./Utils').log
  , colors = require('colors')
  , timer = require('./Utils').timer;
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
  self.updateRegistration();
  self.updateBullets();

  self.lastUpdate = timer();
}

/**
 * Päivittää vakionopeusajastimen
 * @private
 */
Game.prototype.updateFrameTimer = function () {
  var curTime = timer();
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
 * Pitää palvelimen rekisteröinnin kunnossa
 * @private
 */
Game.prototype.updateRegistration = function () {

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
