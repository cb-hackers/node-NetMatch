/**
 * @fileOverview Pitää sisällään bottien tekoälyyn liittyvät toiminnot,
 * {@link BotAI}-luokan toteutuksen.
 */

/**#nocode+*/
var log       = require('./Utils').log
  , rand      = require('./Utils').rand
  , distance  = require('./Utils').distance
  , wrapAngle = require('./Utils').wrapAngle
  , getAngle  = require('./Utils').getAngle
  , colors    = require('colors')
  , Obj       = require('./Object')
  , Weapons   = require('./Weapon')
  , NET       = require('./Constants').NET
  , WPN       = require('./Constants').WPN
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

  // Alustetaan botin tekoälyä ohjaavat asetukset
  this.initBotAI();
}

/**
 * Alustaa botin tekoälyä ohjaavat asetukset.
 */
BotAI.prototype.initBotAI = function () {
  /** Koska aikaisintaan arvotaan botille uusi suunta */
  this.minNextAction = 500;

  /** Koska viimeistään arvotaan botille uusi suunta */
  this.maxNextAction = 1000;

  /** Kun botille arvotaan uusi kääntyminen niin tämä on maksimi. */
  this.randRotation = 90;

  /** Botin nopeus kun se on havainnut esteen */
  this.minSpeed = 80;

  /** Botin nopeus kun tie on vapaa */
  this.maxSpeed = 200;

  /** Jos matkaa esteeseen on vähemmän kuin tämä niin aletaan etsiä uutta suuntaa */
  this.wakeupDist = 100;

  /**
   * Kun pitää päätellä uusi suunta niin se tehdään katselemalla näin monta astetta molempiin
   * suuntiin.
   */
  this.exploreAngle = 50;

  /**
   * Kun botti on lähellä estettä niin tällä määrätään kuinka jyrkällä käännöksellä yritetään
   * väistää. Pienempi arvo on jyrkempi käännös.
   */
  this.dodgeRotation = 0.2;

  /** Kuinka kaukaa voidaan reagoida viholliseen (pikseleissä) */
  this.fightDist = 900;

  /** Botin field of vision, kuinka leveästä kulmasta voidaan poimia pelaaja (0-180 astetta) */
  this.fov = 70;

  /** Kuinka nopeasti botti kääntyy, kun se näkee pelaajan */
  this.fightRotate = 12.5;

  /** Kun botti on pelaajaan nähden tässä kulmassa, aloittaa se ampumisen */
  this.shootingAngle = 32;
}

/**
 * Muuttaa botin asetuksia riippuen annetusta parametrista.
 *
 * @param {Number} param  Arvo väliltä 1...64, jonka perusteella botin taitoja rukataan.
 */
BotAI.prototype.setSkill = function (param) {
  if (param < 1) { param = 1; }
  else if (param > 64) { param = 64; }
  var skill = 65 - param;
  this.fightRotate = 1.5 + (skill / 4.8);
  this.shootingAngle = 4.0 + (param * 4.8);
  this.fov = 58 + (skill * 2);
}

/**
 * Yksittäisen botin tekoälyn päivitys.
 */
BotAI.prototype.update = function () {
  var self = this
    , map = this.server.gameState.map
    , minDist
    , picker
    , pickWall
    , dist1, dist2, dodge
    , objectiveAngle
    , moveDirection = 1
    , pickedPlayer, pickedDist, pickedDirection
    , weaponConfig = Weapons[this.player.weapon]
    , sAngle, isProtected, reloadFactor
    , speed, forwardSpeed, sidestepSpeed;
  // Mikäli botti ei ole liian lähellä seinää ja on aika arpoa sille uusi suunta
  // niin tehdään se nyt.
  if (!this.tooClose && this.nextAction < Date.now()) {
    // Arvotaan seuraavan käännöksen ajankohta eli koska tähän iffiin tullaan seuraavaksi
    this.nextAction = rand(this.minNextAction, this.maxNextAction) + Date.now();
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

  // Hoidetaan bottien varsinainen tekoäly, kun estettä ei ole liian lähellä.
  if (!this.tooClose) {
    // Lasketaan etäisyys edessä olevaan esteeseen.
    // Etäisyys lasketaan objektin keskeltä sekä reunoista eli objektin koko leveydeltä.

    // Luodaan väliaikainen poimintaobjekti
    picker = new Obj(this.player.x, this.player.y, this.player.angle);

    // Poimitaan botin nenän edestä mahdollinen seinä
    pickWall = map.findWall(picker.x, picker.y, picker.angle, this.wakeupDist);
    this.debugRayCast(pickWall, picker, true);
    if (pickWall) {
      minDist = distance(picker.x, picker.y, pickWall.x, pickWall.y);
    }

    // Poimitaan botin vasemman reunan puolelta seinä
    picker.move(0, -15);
    pickWall = map.findWall(picker.x, picker.y, picker.angle, this.wakeupDist);
    this.debugRayCast(pickWall, picker, true);
    if (pickWall) {
      minDist = Math.min(minDist || 99999, distance(picker.x, picker.y, pickWall.x, pickWall.y));
    }

    // Poimitaan botin oikean reunan puolelta seinä
    picker.move(0, 30);
    pickWall = map.findWall(picker.x, picker.y, picker.angle, this.wakeupDist);
    this.debugRayCast(pickWall, picker, true);
    if (pickWall) {
      minDist = Math.min(minDist || 99999, distance(picker.x, picker.y, pickWall.x, pickWall.y));
    }

    // Jos tarpeeksi lähellä on seinä niin reagoidaan siihen nyt
    if (minDist) {
      // Käännetään poimintaobjekti samaan kulmaan kuin botti
      picker.angle = this.player.angle;

      // Käännetään katsetta toiselle sivulle ja lasketaan etäisyys lähimpään esteeseen
      picker.turn(-this.exploreAngle);
      pickWall = map.findWall(picker.x, picker.y, picker.angle);
      this.debugRayCast(pickWall, picker, true);
      if (pickWall) {
        dist1 = distance(picker.x, picker.y, pickWall.x, pickWall.y);
      } else {
        // Ei luultavasti ylitetty minkään laatan rajoja kun törmäystä tarkistettiin.
        dist1 = 0;
      }

      // Ja sitten vielä toiseen suuntaan.
      picker.turn(this.exploreAngle * 2);
      pickWall = map.findWall(picker.x, picker.y, picker.angle);
      this.debugRayCast(pickWall, picker, true);
      if (pickWall) {
        dist2 = distance(picker.x, picker.y, pickWall.x, pickWall.y);
      } else {
        // Ei luultavasti ylitetty minkään laatan rajoja kun törmäystä tarkistettiin.
        dist2 = 0;
      }

      // Tutkitaan kumpaan suuntaan on pidempi matka seuraavaan esteeseen ja suunnataan sinne.
      // Kääntymisen jyrkkyyteen vaikuttaa vielä etäisyys esteeseen eli mitä lähempänä ollaan niin
      // sitä jyrkemmin käännytään
      if (dist1 > dist2) {
        dodge = -(this.wakeupDist - minDist);
      } else {
        dodge = this.wakeupDist - minDist;
      }

      // Asetetaan kääntymisnopeus
      this.rotation = dodge / this.dodgeRotation;
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

  // Taisteluäly
  /** @ignore */
  this.server.loopPlayers( function botAIFight(player) {
    // Käydään läpi kaikki muut pelaajat
    var dist, direction;
    if (self.server.gameState.gameMode > 1 && player.team === self.player.team) {
      // Jos ollaan jossain muussa pelimoodissa kuin DM ja pelaaja on samalla puolella kuin botti,
      // ei tarkistettava pelaaja ole vihollinen. Siirrytään seuraavaan.
      return;
    }
    if (player.id === self.player.id || player.health <= 0 || !player.loggedIn) {
      // Ei tarkisteta bottia itseään, kuollutta pelaajaa tai pelaajaa joka ei ole kirjautuneena.
      return;
    }
    dist = distance(self.player.x, self.player.y, player.x, player.y);
    if (dist > self.fightDist) {
      // Pelaaja on liian kaukana, ei reagoida.
      return;
    }
    if (self.server.gameState.map.findWall2(self.player.x, self.player.y, player.x, player.y)) {
      // Oli seinä välissä, joten ei reagoida pelaajaan.
      return;
    }
    if (pickedDist && pickedDist < dist) {
      // Bottia lähempänä on joku toinen pelaaja.
      return;
    }
    direction = getAngle(player.x, player.y, self.player.x, self.player.y) - self.player.angle;
    if (direction > 180) { direction -= 360; }
    if (direction < -180) { direction += 360; }
    if (Math.abs(direction) > self.fov) {
      // Pelaaja oli näkökentän ulkopuolella, ei reagoida.
      return;
    }
    // Nyt kaikki tarkistukset on tehty ja voidaan poimia pelaaja.
    pickedPlayer = player;
    pickedDist = dist;
    pickedDirection = direction;
  });
  // Onko joku uhri näkösällä
  if (pickedPlayer) {
    // Piirretään uhriin viiva
    this.debugLine(this.player.x, this.player.y, pickedPlayer.x, pickedPlayer.y);
    if (this.sideStep === 0) {
      this.sideStep = rand(-1, 1, true);
    }
    // Nollataan liikkumistekoäly
    this.tooClose = false;
    // Asetetaan kääntyminen kohti uhria
    this.rotation = pickedDirection * this.fightRotate;
    // Aseesta riippuen etäisyys kohteeseen ei saa olla liian pieni
    weaponConfig = Weapons[this.player.weapon];
    if (pickedDist < weaponConfig.safeRange) {
      moveDirection = -1;
    }
    // Ammutaan vain jos kulma on riittävän pieni eikä pelaajalle ole nakkina
    sAngle = this.shootingAngle;
    if (this.player.weapon === WPN.CHAINSAW) { sAngle *= 2; }
    if (!(pickedPlayer.spawnTime + this.server.config.spawnProtection > Date.now()) &&
        !(this.player.spawnTime + this.server.config.spawnProtection > Date.now()) &&
        Math.abs(pickedDirection) < sAngle &&
        pickedDist > weaponConfig.safeRange / 2 && pickedDist <= weaponConfig.shootRange)
    {
      // Kaikki ampumiseen vaadittavat asiat ovat kunnossa!

      // Jos botilla on pistooli niin luodaan sille satunnaisuutta liipasunopeuteen
      if (this.player.weapon === WPN.PISTOL) {
        reloadFactor = rand(1.2, 2, true);
      } else {
        reloadFactor = 1;
      }

      // Sitten vielä tarkistetaan että onko viime ampumisesta kulunut tarpeeksi aikaa
      if (!this.player.lastShoot || this.player.lastShoot + weaponConfig.reloadTime * reloadFactor < Date.now()) {
        // Jea, ammutaan!
        this.server.createBullet(this.player);
        this.player.lastShoot = Date.now();
      }
    }
  }


  // Siirretään bottia
  speed = this.maxSpeed;
  // Jos ollaan liian lähellä jotain estettä niin pienemmällä vauhdilla
  if (this.tooClose) { speed = this.minSpeed; }

  forwardSpeed = moveDirection * 100 / weaponConfig.weight;
  forwardSpeed *= this.server.game.movePerSec(speed);
  sidestepSpeed = this.sideStep * 100.0 / weaponConfig.weight;
  sidestepSpeed *= this.server.game.movePerSec(PLR.SIDESTEP_SPEED * 0.8);
  this.player.move(forwardSpeed, sidestepSpeed);
};

/**
 * Debuggaa raycastia
 */
BotAI.prototype.debugRayCast = function (collision, picker, drawLineToCollision) {
  if (true || !this.server.debug) { return; }
  if (!collision && drawLineToCollision) { return; }
  var self = this
    , startX, startY, endX, endY, colX, colY;

  startX = Math.round(picker.x);
  startY = Math.round(picker.y);
  if (collision) {
    colX = Math.round(collision.x);
    colY = Math.round(collision.y);
    if (drawLineToCollision) {
      endX = colX;
      endY = colY;
    }
  }
  if (!collision || !drawLineToCollision) {
    endX = Math.round(picker.x + Math.cos(picker.angle / 180 * Math.PI) * this.wakeupDist);
    endY = Math.round(picker.y + Math.sin(picker.angle / 180 * Math.PI) * this.wakeupDist);
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
      if (drawLineToCollision || !collision) { return; }
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
};

/**
 * Piirtää debug-viivan yhdestä pisteestä toiseen
 */
BotAI.prototype.debugLine = function (x1, y1, x2, y2) {
  if (true || !this.server.debug) { return; }
  var self = this;
  this.server.loopPlayers(function (player) {
    if (player.debugState) {
      player.debugState += 1;
      self.server.messages.add(player.id, {
        msgType: NET.DEBUGDRAWING,
        drawType: DRAW.LINE,
        drawVars: [
          x1,
          y1,
          x2,
          y2
        ]
      });
    }
  });
};

module.exports = BotAI;
