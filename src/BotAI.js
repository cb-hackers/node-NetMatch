/**
 * @fileOverview Pitää sisällään bottien tekoälyyn liittyvät toiminnot,
 * {@link BotAI}-luokan toteutuksen.
 */

/**#nocode+*/
var log = require('./Utils').log
  , rand = require('./Utils').rand
  , colors = require('colors');
/**#nocode-*/

/**
 * Alustaa uuden tekoälyn.
 * @class Bottien tekoäly
 *
 * @param {Player} player  {@link Player}-luokan instanssi johon tämä tekoäly kuuluu.
 *
 * @property {Float}   nextAngle     Kulma johon botin pitäisi liikkua
 * @property {Float}   lastAngle     Kuinka paljon botin ja kohdekulman ero oli edellisellä kierroksella
 * @property {Float}   rotation      Tällä käännetään objektia (TurnObject)
 * @property {Float}   sideStep      Botin sivuaskeleet
 * @property {integer} nextAction    Ajankohta jolloin botille arvotaan uusi suunta
 * @property {Integer} tooClose      Botti on liian lähellä seinää tai toista pelaajaa
 * @property {Float}   fightRotate   Kääntymisnopeus kun ollaan havaittu vastustaja
 * @property {Float}   shootingAngle Ammutaan kun uhri on tämän kulman sisällä botin edessä
*/
function BotAI(player) {
  this.player = player;
  this.nextAngle = 0;
  this.lastAngle = 0;
  this.rotation = 0;
  this.sideStep = 0;
  this.nextAction = 0;
  this.tooClose = 0;
  this.fightRotate = 0;
  this.shootingAngle = 0;
}

/**
 * Yksittäisen botin tekoälyn päivitys.
 */
BotAI.prototype.update = function () {
  // Mikäli botti ei ole liian lähellä seinää ja on aika arpoa sille uusi suunta
  // niin tehdään se nyt.
  if (!this.tooClose && this.nextAction < Date.now()) {
    // Arvotaan seuraavan käännöksen ajankohta eli koska tähän iffiin tullaan seuraavaksi
    this.nextAction = rand(500,1000) + Date.now();
    // Arvotaan botille uusi kääntyminen
    this.rotation = rand(-90, 90, true);
    
    if (this.sideStep !== 0) {
      this.sideStep = rand(-1, 1, true);
    }
    
    // Spam much?
    /*
    log.debug('Updated botAI for %0 (playerId %1)', this.player.name.green, 
      String(this.player.playerId).magenta);
    */
  }
}

exports = module.exports = BotAI;
