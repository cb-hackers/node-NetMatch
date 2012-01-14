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
  , Obj      = require('./Object')
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
  var minDist, dist, self = this
    , map = this.server.gameState.map
    , pickerObject
    , colFront, colLeft, colRight;
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

  // Käännetään bottia
  if (this.player.zombie) {
    this.player.turn(this.server.game.movePerSec(this.rotation));
  }

  // Seuraavaksi alkaa varsinainen tekäly jossa tutkitaan ympäristöä.
  // Tämä tehdään kuitenkin vain mikäli botti ei ole liian lähellä jotakin estettä.
  if (!this.tooClose) {
    // Lasketaan etäisyys edessä olevaan esteeseen.
    // Etäisyys lasketaan objektin keskeltä sekä reunoista eli objektin koko leveydeltä.

    // Luodaan väliaikainen poimintaobjekti
    picker = new Obj(this.player.x, this.player.y, this.player.angle);

    // Poimitaan lähin este suoraan nenän edestä
    colFront = map.findWall(picker.x, picker.y, picker.angle, this.config.wakeupDist);
    this.debugRayCast(colFront, picker);

    // Poimitaan botin vasemman reunan puolelta lähin seinä
    picker.move(0, -15);
    colLeft = map.findWall(picker.x, picker.y, picker.angle, this.config.wakeupDist);
    this.debugRayCast(colLeft, picker);

    // Poimitaan botin oikean reunan puolelta lähin seinä
    picker.move(0, 30);
    colRight = map.findWall(picker.x, picker.y, picker.angle, this.config.wakeupDist);
    this.debugRayCast(colRight, picker);
  }
};

/**
 * Debuggaa raycastia
 */
BotAI.prototype.debugRayCast = function (collision, picker) {
  if (!this.server.debug) {
    return;
  }
  var self = this
    , startX, startY, endX, endY, colX, colY;

  startX = Math.round(picker.x);
  startY = Math.round(picker.y);
  endX = Math.round(picker.x + Math.cos(picker.angle / 180 * Math.PI) * this.config.wakeupDist);
  endY = Math.round(picker.y + Math.sin(picker.angle / 180 * Math.PI) * this.config.wakeupDist);
  if (collision) {
    colX = Math.round(collision.x);
    colY = Math.round(collision.y);
  }

  this.server.loopPlayers(function (player) {
    if (player.debugState) {
      player.debugState += 1;
      self.server.messages.add(player.id, {
        msgType: NET.DEBUGDRAWING,
        drawType: DRAW.LINE,
        drawVars: [
          startX,
          startY,
          endX,
          endY
        ]
      });
      if (!collision) { return; }
      self.server.messages.add(player.id, {
        msgType: NET.DEBUGDRAWING,
        drawType: DRAW.CIRCLE,
        drawVars: [
          colX,
          colY,
          5,
          0
        ]
      });
    }
  });
}

module.exports = BotAI;
