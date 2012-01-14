/**
 * @fileOverview Pitää sisällään bottien tekoälyyn liittyvät toiminnot,
 * {@link BotAI}-luokan toteutuksen.
 */

/**#nocode+*/
var log       = require('./Utils').log
  , rand      = require('./Utils').rand
  , distance  = require('./Utils').distance
  , wrapAngle = require('./Utils').wrapAngle
  , colors    = require('colors')
  , Obj       = require('./Object')
  , Weapons   = require('./Weapon')
  , NET       = require('./Constants').NET
  , PLR       = require('./Constants').PLR
  , DRAW      = require('./Constants').DRAW;
/**#nocode-*/

/**
 * Alustaa uuden tekoälyn.
 * @class Bottien tekoäly
 *
 * @param {Server} server  NetMatch-palvelin
 * @param {Player} player  {@link Player}-luokan instanssi johon tämä tekoäly kuuluu.
 *
 * @property {Player}   player        Player-luokan instanssi johon tämä tekoäly kuuluu.
 * @property {Number}   nextAngle     Kulma johon botin pitäisi liikkua
 * @property {Number}   lastAngle     Kuinka paljon botin ja kohdekulman ero oli edellisellä kierroksella
 * @property {Number}   rotation      Tällä käännetään objektia (TurnObject)
 * @property {Number}   sideStep      Botin sivuaskeleet
 * @property {Number}   nextAction    Ajankohta jolloin botille arvotaan uusi suunta
 * @property {Boolean}  tooClose      Botti on liian lähellä seinää tai toista pelaajaa
 * @property {Number}   fightRotate   Kääntymisnopeus kun ollaan havaittu vastustaja
 * @property {Number}   shootingAngle Ammutaan kun uhri on tämän kulman sisällä botin edessä
 * @property {Object}   config        Botin tekoälyä ohjaavat asetukset: {@link BotAI#initConfig}
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
  this.config = {};

  // Alustetaan botin tekoälyä ohjaavat asetukset
  this.initConfig();
}

/**
 * Alustaa botin tekoälyä ohjaavat asetukset.
 */
BotAI.prototype.initConfig = function () {
  /** Koska aikaisintaan arvotaan botille uusi suunta */
  this.config.minNextAction = 500;

  /** Koska viimeistään arvotaan botille uusi suunta */
  this.config.maxNextAction = 1000;

  /** Kun botille arvotaan uusi kääntyminen niin tämä on maksimi. */
  this.config.randRotation = 90;

  /** Botin nopeus kun se on havainnut esteen */
  this.config.minSpeed = 80;

  /** Botin nopeus kun tie on vapaa */
  this.config.maxSpeed = 200;

  /** Jos matkaa esteeseen on vähemmän kuin tämä niin aletaan etsiä uutta suuntaa */
  this.config.wakeupDist = 100;

  /**
   * Kun pitää päätellä uusi suunta niin se tehdään katselemalla näin monta astetta molempiin
   * suuntiin.
   */
  this.config.exploreAngle = 50;

  /**
   * Kun botti on lähellä estettä niin tällä määrätään kuinka jyrkällä käännöksellä yritetään
   * väistää. Pienempi arvo on jyrkempi käännös.
   */
  this.config.dodgeRotation = 0.2;
}

/**
 * Yksittäisen botin tekoälyn päivitys.
 */
BotAI.prototype.update = function () {
  var self = this
    , map = this.server.gameState.map
    , wakeupDist = this.config.wakeupDist
    , superLargeDist = (map.width + map.height) * map.tileSize
    , minDist
    , picker
    , pickWall
    , dist1, dist2, dodge
    , objectiveAngle
    , moveDirection = 1
    , speed, forwardSpeed, sidestepSpeed
    , weaponWeight = Weapons[this.player.weapon].weight;
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
  }

  // Käännetään bottia
  if (this.player.zombie) {
    this.player.turn(this.server.game.movePerSec(this.rotation));
  }

  // Seuraavaksi alkaa varsinainen tekoäly jossa tutkitaan ympäristöä.
  // Tämä tehdään kuitenkin vain mikäli botti ei ole liian lähellä jotakin estettä.
  if (!this.tooClose) {
    // Lasketaan etäisyys edessä olevaan esteeseen.
    // Etäisyys lasketaan objektin keskeltä sekä reunoista eli objektin koko leveydeltä.

    // Luodaan väliaikainen poimintaobjekti
    picker = new Obj(this.player.x, this.player.y, this.player.angle);

    // Poimitaan botin nenän edestä mahdollinen seinä
    pickWall = map.findWall(picker.x, picker.y, picker.angle, wakeupDist);
    this.debugRayCast(pickWall, picker);
    if (pickWall) {
      minDist = distance(picker.x, picker.y, pickWall.x, pickWall.y);
    }

    // Poimitaan botin vasemman reunan puolelta seinä
    picker.move(0, -15);
    pickWall = map.findWall(picker.x, picker.y, picker.angle, wakeupDist);
    this.debugRayCast(pickWall, picker);
    if (pickWall) {
      minDist = Math.min(minDist, distance(picker.x, picker.y, pickWall.x, pickWall.y));
    }

    // Poimitaan botin oikean reunan puolelta seinä
    picker.move(0, 30);
    pickWall = map.findWall(picker.x, picker.y, picker.angle, wakeupDist);
    this.debugRayCast(pickWall, picker);
    if (pickWall) {
      minDist = Math.min(minDist, distance(picker.x, picker.y, pickWall.x, pickWall.y));
    }

    // Jos tarpeeksi lähellä on seinä niin reagoidaan siihen nyt
    if (minDist) {
      // Käännetään poimintaobjekti samaan kulmaan kuin botti
      picker.angle = this.player.angle;

      // Käännetään katsetta toiselle sivulle ja lasketaan etäisyys lähimpään esteeseen
      picker.turn(-this.config.exploreAngle);
      pickWall = map.findWall(picker.x, picker.y, picker.angle, superLargeDist);
      this.debugRayCast(pickWall, picker);
      dist1 = distance(picker.x, picker.y, pickWall.x, pickWall.y);

      // Ja sitten vielä toiseen suuntaan.
      picker.turn(this.config.exploreAngle * 2);
      pickWall = map.findWall(picker.x, picker.y, picker.angle, superLargeDist);
      this.debugRayCast(pickWall, picker);
      dist2 = distance(picker.x, picker.y, pickWall.x, pickWall.y);

      // Tutkitaan kumpaan suuntaan on pidempi matka seuraavaan esteeseen ja suunnataan sinne.
      // Kääntymisen jyrkkyyteen vaikuttaa vielä etäisyys esteeseen eli mitä lähempänä ollaan niin
      // sitä jyrkemmin käännytään
      if (dist1 > dist2) {
        dodge = -(wakeupDist - minDist);
      } else {
        dodge = wakeupDist - minDist;
      }

      // Asetetaan kääntymisnopeus
      this.rotation = dodge / this.config.dodgeRotation;
      // Asetetaan tavoitekulma
      this.nextAngle = wrapAngle(this.player.angle + dodge);
      // Asetetaan vielä tooClose-muuttuja päälle eli tekoälyä ei päivitetä ennen kuin objekti on
      // kääntynyt tavoitekulmaan. Samalla myös objektin nopeutta vähennetään.
      this.tooClose = true;

      this.lastAngle = this.player.angle - this.nextAngle;
      if (this.lastAngle > 180) { this.lastAngle -= 360; }
      if (this.lastAngle < -180) { this.lastAngle += 360; }
    }
  } else {
    // Botti on liian lähellä jotain estettä.
    // tooClose-muuttuja nollataan vain jos tekoälyn asettama tavoitekulma on saavutettu.
    objectiveAngle = this.player.angle - this.nextAngle;
    if (objectiveAngle > 180) { objectiveAngle -= 360; }
    if (objectiveAngle < -180) { objectiveAngle += 360; }
    if ((objectiveAngle < 0 && this.lastAngle >= 0) || (objectiveAngle > 0 && this.lastAngle <= 0)) {
      // Objektin kulma on nyt riittävän lähellä tavoitekulmaa joten kääntäminen voidaan lopettaa.
      this.rotation = 0;
      this.tooClose = false;
    }
    this.lastAngle = objectiveAngle;
  }

  // Siirretään bottia
  speed = this.config.maxSpeed;
  // Jos ollaan liian lähellä jotain estettä niin pienemmällä vauhdilla
  if (this.tooClose) { speed = this.config.minSpeed; }

  forwardSpeed = moveDirection * 100 / weaponWeight;
  forwardSpeed *= this.server.game.movePerSec(speed);
  sidestepSpeed = this.sideStep * 100.0 / weaponWeight;
  sidestepSpeed *= this.server.game.movePerSec(PLR.SIDESTEP_SPEED * 0.8);
  this.player.move(forwardSpeed, sidestepSpeed);
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
