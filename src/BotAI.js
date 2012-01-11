/**
 * @fileOverview Pitää sisällään bottien tekoälyyn liittyvät toiminnot,
 * {@link BotAI}-luokan toteutuksen.
 */

/**#nocode+*/
var log      = require('./Utils').log
  , rand     = require('./Utils').rand
  , distance = require('./Utils').distance
  , getAngle = require('./Utils').getAngle
  , colors   = require('colors')
  , NET      = require('./Constants').NET
  , DRAW     = require('./Constants').DRAW;
/**#nocode-*/

/**
 * Alustaa uuden tekoälyn.
 * @class Bottien tekoäly
 *
 * @param {Server} server  NetMatch-palvelin
 * @param {Player} player  {@link Player}-luokan instanssi johon tämä tekoäly kuuluu.
 *
 * @property {Player}   player        {@link Player}-luokan instanssi johon tämä tekoäly kuuluu.
 * @property {Number}   nextAngle     Kulma johon botin pitäisi liikkua
 * @property {Number}   lastAngle     Kuinka paljon botin ja kohdekulman ero oli edellisellä kierroksella
 * @property {Number}   rotation      Tällä käännetään objektia (TurnObject)
 * @property {Number}   sideStep      Botin sivuaskeleet
 * @property {Number}   nextAction    Ajankohta jolloin botille arvotaan uusi suunta
 * @property {Boolean}  tooClose      Botti on liian lähellä seinää tai toista pelaajaa
 * @property {Number}   fightRotate   Kääntymisnopeus kun ollaan havaittu vastustaja
 * @property {Number}   shootingAngle Ammutaan kun uhri on tämän kulman sisällä botin edessä
 * @property {Object}   config        Botin tekoälyä ohjaavat asetukset: {@link #initConfig}
*/
function BotAI(server, player) {
  this.server = server;
  this.player = player;
  this.nextAngle = 0;
  this.lastAngle = 0;
  this.rotation = 0;
  this.sideStep = 0;
  this.nextAction = 0;
  this.tooClose = false;
  this.fightRotate = 0;
  this.shootingAngle = 0;

  // Alustetaan botin tekoälyä ohjaavat asetukset
  this.initConfig();
}

/**
 * Alustaa botin tekoälyä ohjaavat asetukset.
 */
BotAI.prototype.initConfig = function () {
  // Tähän alustetaan asetukset ja tämä asetetaan lopulta this.config -kenttään
  var c = {};

  /** Koska aikaisintaan arvotaan botille uusi suunta */
  c.minNextAction = 500;

  /** Koska viimeistään arvotaan botille uusi suunta */
  c.maxNextAction = 1000;

  /** Kun botille arvotaan uusi kääntyminen niin tämä on maksimi. */
  c.randRotation = 90;

  /** Botin nopeus kun se on havainnut esteen */
  c.minSpeed = 80;

  /** Botin nopeus kun tie on vapaa */
  c.maxSpeed = 200;

  /** Jos matkaa esteeseen on vähemmän kuin tämä niin aletaan etsiä uutta suuntaa */
  c.wakeupDist = 100;

  /**
   * Kun pitää päätellä uusi suunta niin se tehdään katselemalla näin monta astetta molempiin
   * suuntiin.
   */
  c.exploreAngle = 50;

  /**
   * Kun botti on lähellä estettä niin tällä määrätään kuinka jyrkällä käännöksellä yritetään
   * väistää. Pienempi arvo on jyrkempi käännös.
   */
  c.dodgeRotation = 0.2;

  this.config = c;
}

/**
 * Yksittäisen botin tekoälyn päivitys.
 */
BotAI.prototype.update = function () {
  var minDist, dist, self = this;
  // Mikäli botti ei ole liian lähellä seinää ja on aika arpoa sille uusi suunta
  // niin tehdään se nyt.
  if (!this.tooClose && this.nextAction < Date.now()) {
    // Arvotaan seuraavan käännöksen ajankohta eli koska tähän iffiin tullaan seuraavaksi
    this.nextAction = rand(this.config.minNextAction, this.config.maxNextAction) + Date.now();
    // Arvotaan botille uusi kääntyminen
    this.rotation = rand(-90, 90, true);

    if (this.sideStep !== 0) {
      this.sideStep = rand(-1, 1, true);
    }

    // Spam much?
    /*
    log.debug('Updated botAI for %0 (playerId %1)', this.player.name.green,
      String(this.player.id).magenta);
    */
  }

  // Piirrellään debugtavaraa klienteille
  var debugDraw = [];
  debugDraw.push({
    msgType: NET.DEBUGDRAWING,
    drawType: DRAW.CIRCLE,
    drawVars: [
      Math.round(this.player.x),
      Math.round(this.player.y),
      this.config.wakeupDist,
      0
    ]
  });
  debugDraw.push({
    msgType: NET.DEBUGDRAWING,
    drawType: DRAW.LINE,
    drawVars: [
      Math.round(this.player.x),
      Math.round(this.player.y),
      Math.round(this.player.x  + Math.cos(this.player.angle / 180 * Math.PI) * this.config.wakeupDist),
      Math.round(this.player.y  + Math.sin(this.player.angle / 180 * Math.PI) * this.config.wakeupDist)
    ]
  });

  this.server.loopPlayers( function(player) {
    if (self.lastDebugged <= player.lastActivity) {
      self.server.messages.add(player.id, debugDraw[0]);
      self.server.messages.add(player.id, debugDraw[1]);
    }
  });

  this.lastDebugged = Date.now();

  // Käännetään bottia
  this.player.turn(this.server.game.movePerSec(this.rotation));

  // Seuraavaksi alkaa varsinainen tekäly jossa tutkitaan ympäristöä.
  // Tämä tehdään kuitenkin vain mikäli botti ei ole liian lähellä jotakin estettä.
  if (!this.tooClose) {
    // Lasketaan etäisyys edessä olevaan esteeseen.
    // Etäisyys lasketaan objektin keskeltä sekä reunoista eli objektin koko leveydeltä.


  }
};


module.exports = BotAI;
