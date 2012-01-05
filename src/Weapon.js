/**
 * @fileOverview Sisältää {@link Weapon}-luokan toteutuksen sekä {@link Server#bullets} kokoelman.
 */

/**#nocode+*/
var log = require('./Utils').log
  , rand = require('./Utils').rand
  , distance = require('./Utils').distance
  , NET = require('./Constants').NET
  , WPN = require('./Constants').WPN
  , Obj = require('./Object');
/**#nocode-*/

/**
 * @namespace Sisältää aseet ja niiden ominaisuudet. Jokaisella aseella on alla olevat kentät:
 * <table>
 * <tr><td> reloadTime   </td><td>  Latausaika  </td></tr>
 * <tr><td> bulletSpeed  </td><td>  Paljonko ammus liikkuu yhdessä sekunnissa  </td></tr>
 * <tr><td> bulletForth  </td><td>  Ammuksen lähtöpaikka pelaajan etupuolella  </td></tr>
 * <tr><td> bulletYaw    </td><td>  Ammuksen lähtöpaikka sivusuunnassa  </td></tr>
 * <tr><td> damage       </td><td>  Ammuksen aiheuttama tuho  </td></tr>
 * <tr><td> damageRange  </td><td>  Tuhoalueen laajuus  </td></tr>
 * <tr><td> spread       </td><td>  Hajonta asteina  </td></tr>
 * <tr><td> maxAmmo      </td><td>  Ammusten maksimimäärä  </td></tr>
 * <tr><td> pickCount    </td><td>  Kuinka paljon tavaraa saa poimittaessa  </td></tr>
 * <tr><td> safeRange    </td><td>  Etäisyys jonka alle kohteesta oleva botti ei ammu  </td></tr>
 * <tr><td> shootRange   </td><td>  Etäisyys jonka alle kohteesta oleva botti ampuu  </td></tr>
 * <tr><td> weight       </td><td>  Aseen paino, vaikuttaa liikkumisen nopeuteen. 100 = normaali  </td></tr>
 * <tr><td> name         </td><td>  Aseen nimi merkkijonona, debuggailua varten  </td></tr>
 * </table>
 */
var Weapons = [
  // Aseet alkavat vasta ID:stä 1
  null,
  /**
   * Pistooli, <code>Weapons[WPN.PISTOL]</code>
   * @name Weapons#1
   */
  {
    reloadTime: 250,
    bulletSpeed: 1200,
    bulletForth: 33,
    bulletYaw: 10,
    damage: 19,
    damageRange: 0,
    spread: 0,
    maxAmmo: 0,
    pickCount: undefined,
    safeRange: 100,
    shootRange: 500,
    weight: 100,
    name: "pistol"
  },
  /**
   * Konekivääri, <code>Weapons[WPN.MGUN]</code>
   * @name Weapons#2
   */
  {
    reloadTime: 100,
    bulletSpeed: 1000,
    bulletForth: 29,
    bulletYaw: 8,
    damage: 17,
    damageRange: 0,
    spread: 2,
    maxAmmo: 150,
    pickCount: 50,
    safeRange: 200,
    shootRange: 500,
    weight: 100,
    name: "machinegun"
  },
  /**
   * Sinko, <code>Weapons[WPN.BAZOOKA]</code>
   * @name Weapons#3
   */
  {
    reloadTime: 1500,
    bulletSpeed: 900,
    bulletForth: 30,
    bulletYaw: 8,
    damage: 150,
    damageRange: 250,
    spread: 0,
    maxAmmo: 10,
    pickCount: 5,
    safeRange: 300,
    shootRange: 500,
    weight: 115,
    name: "bazooka"
  },
  /**
   * Haulikko, <code>Weapons[WPN.SHOTGUN]</code>
   * @name Weapons#4
   */
  {
    reloadTime: 1000,
    bulletSpeed: 900,
    bulletForth: 33,
    bulletYaw: 10,
    damage: 20,
    damageRange: 0,
    spread: 15,
    maxAmmo: 20,
    pickCount: 10,
    safeRange: 150,
    shootRange: 300,
    weight: 100,
    name: "shotgun"
  },
  /**
   * Kranaatinlaukaisin, <code>Weapons[WPN.LAUNCHER]</code>
   * @name Weapons#5
   */
  {
    reloadTime: 1000,
    bulletSpeed: 400,
    bulletForth: 32,
    bulletYaw: 8,
    damage: 200,
    damageRange: 150,
    spread: 5,
    maxAmmo: 6,
    pickCount: 2,
    safeRange: 300,
    shootRange: 400,
    weight: 110,
    name: "launcher"
  },
  /**
   * Moottorisaha, <code>Weapons[WPN.CHAINSAW]</code>
   * @name Weapons#6
   */
  {
    reloadTime: 100,
    bulletSpeed: 0,
    bulletForth: 45,
    bulletYaw: 9,
    damage: 70,
    damageRange: 60,
    spread: 0,
    maxAmmo: 100,
    pickCount: 50,
    safeRange: 60,
    shootRange: 150,
    weight: 90,
    name: "chainsaw"
  }
];

/**
 * Luo uuden ammuksen.
 *
 * @class Ammus
 *
 * @param {Server} server     Palvelimen sisältävä muuttuja, instanssi luokasta {@link Server}.
 * @param {Integer} playerId  Pelaajan, joka ampui ammuksen, ID
 * @param {Integer} [extraBullet=0]
 *
 * @property {Short}   bulletId     Ammuksen tunnus
 * @property {Integer} playerId     Kuka ampui
 * @property {Byte}    weapon       Millä aseella tämä on ammuttu
 * @property {Integer} x            Paikkatietoa
 * @property {Integer} y            Paikkatietoa
 * @property {Integer} angle        Ammuksen kulma
 * @property {Float}   prevPosX     Ammuksen edellinen paikka
 * @property {Float}   prevPosY     Ammuksen edellinen paikka
 * @property {Byte}    moved        Onko ammusta vielä liikutettu yhtään
 * @property {Integer} timeShooted  Milloin ammus on ammuttu
 */
function Bullet(server, playerId, extraBullet) {
  Obj.call(this, 0, 0, 0);
  var player
    , weaponConfig
    , bPos
    , spread
    , randomSpread;

  this.server = server;

  if ('undefined' === typeof extraBullet) {
    extraBullet = 0;
  }

  // UNIMPLEMENTED
  // Ei tehdä ammusta jos erä on päättynyt

  // Haetaan pelaaja joka ampui
  player = server.players[playerId];

  // Jos pelaaja on nakkina niin ei anneta sen luoda uutta ammusta
  if (player.spawnTime + server.config.spawnProtection > Date.now()) {
    return;
  }

  // Luodaan ammus
  this.bulletId = ++server.lastBulletId;  // Ammuksen tunnus
  this.weapon = player.weapon;            // Millä aseella ammuttu
  this.playerId = playerId;               // Kuka ampui
  this.timeShooted = Date.now();             // Koska ammuttu
  this.moved = 0;
  this.x = player.x;
  this.y = player.y;
  this.angle = player.angle;

  weaponConfig = Weapons[player.weapon];

  // Debugataan
  log.debug('Created bullet %0 (%1), shot by %2',
    String(this.bulletId).magenta, weaponConfig.name.yellow, player.name.green);

  // Mistä ammus lähtee pelaajaan nähden
  bPos = weaponConfig.bulletYaw;
  if (player.weapon === WPN.PISTOL) {
    if (!player.handShooted) {
      bPos = -bPos;
      player.handShooted = 1;
    } else {
      player.handShooted = 0;
    }
  }
  this.x += Math.cos((this.angle) / 180 * Math.PI) * weaponConfig.bulletForth;
  this.y += Math.sin((this.angle) / 180 * Math.PI) * weaponConfig.bulletForth;
  this.x += Math.cos((this.angle - 90) / 180 * Math.PI) * bPos;
  this.y += Math.sin((this.angle - 90) / 180 * Math.PI) * bPos;
  this.prevPosX = this.x;
  this.prevPosY = this.y;

  // Hajonta
  spread = weaponConfig.spread;
  if (player.weapon === WPN.LAUNCHER) {
    if (extraBullet) {
      spread = -spread;
    }
  } else {
    spread = rand(-spread, spread);
  }

  this.angle += spread;
  if (player.weapon === WPN.SHOTGUN) {
    randomSpread = rand(0, 20);
    this.x += Math.cos((this.angle / 180) * Math.PI) * randomSpread;
    this.y += Math.sin((this.angle / 180) * Math.PI) * randomSpread;
  }

  // Tarkista että onko ammus kartan sisällä ja liikuttele taaksepäin kunnes ei ole
  for (var i = 50; i--;) {
    if (!server.gameState.map.isColliding(this.x, this.y)) {
      break;
    }
    this.x -= Math.cos((this.angle / 180) * Math.PI);
    this.y -= Math.sin((this.angle / 180) * Math.PI);
  }
  // Jos mentiin edellinen for-looppi loppuun asti, niin failataan ammuksen luonti.
  if (i < 0) {
    log.warn("Player %0 tried to shoot a bullet while inside of a wall!", player.name);
    server.lastBulletId--;
    return;
  }

  // Lisätään palvelimen bullets-kokoelmaan tämä ammus
  server.bullets[this.bulletId] = this;

  // Lisätään ammusviesti lähetettäväksi jokaiselle pelaajalle
  server.messages.addToAll({
    msgType: NET.NEWBULLET,
    bulletId: this.bulletId,
    sndPlay: !extraBullet,
    weapon: player.weapon,
    playerId: playerId,
    x: this.x,
    y: this.y,
    handShooted: player.handShooted
  });

  if (player.weapon === WPN.LAUNCHER && !extraBullet) {
    // Jos tämä on ammuttu kranaatinheittimellä niin tehdään vielä toinen ammus koska 2 kranaattia
    new Bullet(server, playerId, 1);
  }

  // Haulikosta lähtee monta kutia
  if (player.weapon === WPN.SHOTGUN && extraBullet < 6) {
    new Bullet(server, playerId, extraBullet + 1);
  }
}
Bullet.prototype = new Obj();
Bullet.prototype.constructor = Bullet;

/**
 * Päivittää yksittäisen ammuksen.
 */
Bullet.prototype.update = function () {
  var weaponConfig = Weapons[this.weapon]
    , speed = weaponConfig.bulletSpeed // Nopeus riippuu siitä, millä aseella ammus on ammuttu
    , hit = false;

  if (!this.moved) {
    this.moved = 1;
    speed = 0;
  }
  this.move(this.server.game.movePerSec(speed));

  // Jos on ammuttu kranaatinlaukaisimella niin tutkitaan aikaviive (1 sekunti)
  if (this.weapon === WPN.LAUNCHER && this.timeShooted + 1000 < Date.now()) {
    hit = true;

    // Lisätään viestijonoon ilmoitus osumasta.
    this.server.messages.addToAll({
      msgType: NET.BULLETHIT,  // Mikä viesti
      bulletId: this.bulletId, // Ammuksen tunnus
      playerId: 0,             // Keneen osui
      x: this.x,               // Missä osui
      y: this.y,               // Missä osui
      weapon: this.weapon      // Millä aseella ammus ammuttiin
    });

    // Tarkistetaan räjähdysalue ja vahingoitetaan pelaajia
    this.checkExplosion();
  }

  // Osuiko seinään, menikö kartalta ulos tai onko moottorisaha
  if (!hit && (this.server.gameState.map.isColliding(this.x, this.y) || this.weapon === WPN.CHAINSAW)) {
    hit = true;
    // Tarkistetaan räjähdysalue ja vahingoitetaan pelaajia
    this.checkExplosion();
  } else if (!hit) {
    // Ei osunut seinään mutta osuiko pelaajaan
    // UNIMPLEMENTED
    // Ei tarkisteta jos kierros on päättynyt

    var playerIds = Object.keys(this.server.players);
    for (var i = playerIds.length; i--;) {
      hit = this.checkPlayerHit(this.server.players[playerIds[i]]);
      if (hit) {
        break;
      }
    }

  }

  if (hit) {
    // Jos ollaan törmätty johonkin, poistetaan ammus.
    log.debug('Deleted bullet %0 (%1).', String(this.bulletId).magenta, weaponConfig.name.yellow);
    delete this.server.bullets[this.bulletId];
    delete this;
  } else {
    this.prevPosX = this.x;
    this.prevPosY = this.y;
  }
}

/**
 * Tutkii onko pelaajia räjähdyksen vaikutusalueella. Tai moottorisahan (lol?).
 *
 * @param {Number} [x=this.x]  Tarkistuspisteen x-koordinaatti
 * @param {Number} [y=this.y]  Tarkistuspisteen y-koordinaatti
 *
 * @returns {Boolean} Räjähtikö ammus
 */
Bullet.prototype.checkExplosion = function (x, y) {
  var damageRange = Weapons[this.weapon].damageRange;

  // Poistutaan jos ammus ei ole räjähtävää mallia
  if (!damageRange) {
    return false;
  }

  // Tarkistetaan, onko annettu x- ja y-koordinaatit parametreina
  if ('number' !== typeof x || 'number' !== typeof y) {
    x = this.x;
    y = this.y;
  }

  log.debug('Checking explosion from %0 (%1) at (%2, %3).',
    String(this.bulletId).magenta, Weapons[this.weapon].name.yellow,
    this.x.toFixed(1).blue, this.y.toFixed(1).blue);

  var playerIds = Object.keys(this.server.players);
  for (var i = playerIds.length; i--;) {
    var player = this.server.players[playerIds[i]]
      , isProtected = (player.spawnTime + this.server.config.spawnProtection > Date.now());
    // Onko pelaaja aktiivinen, hengissä eikä suojattu
    if (player.active && player.health > 0 && !isProtected) {
      var dist = distance(x, y, player.x, player.y)
        , checkRange = true;

      if (this.weapon === WPN.CHAINSAW && this.playerId === player.playerId) {
        // Moottorisahalla ei voi osua itseensä
        checkRange = false;
      }

      // Onko etäisyys pienempi kuin räjähdyksen vaikutusalue
      if (dist <= damageRange && checkRange) {
        player.applyExplosion(this, dist);
      }
    }
  }

  // Ammus on räjähtänyt.
  return true;
}

/**
 * Tutkii osuiko ammus pelaajaan.
 * @param {Player} player  Pelaaja, kehen tarkistus kohdistuu.
 * @returns {Boolean} Osuiko vai eikö
 */
Bullet.prototype.checkPlayerHit = function (player) {
  var isProtected = (player.spawnTime + this.server.config.spawnProtection > Date.now())
    , move
    , xMove
    , yMove;
  // Osuma tutkitaan vain jos pelaaja on aktiivinen ja hengissä
  if (!isProtected && player.active && player.health > 0) {
    move = distance(this.prevPosX, this.prevPosY, this.x, this.y);
    xMove = (this.x - this.prevPosX) / move;
    yMove = (this.y - this.prevPosY) / move;

    // Ammus on voinut kulkea yhden framen aikana paljonkin joten tutkitaan siirtymää vähitellen.
    var steps = Math.ceil(move / 5);
    if (steps > 0) {
      // Tutkitaan välipisteet
      var stp = move / steps;
      for (var i = 1; i <= steps; i++) {
        var bPos = i * stp
          , bx = this.prevPosX + (xMove * bPos)
          , by = this.prevPosY + (yMove * bPos);

        // Nyt tarkistetaan osuma. Osumaa itseensä ei tarkisteta
        if (player.playerId !== this.playerId && distance(player.x, player.y, bx, by) < 20) {
          // Osui
          player.bulletHit(this, bx, by);
          return true;
        }
      }
    }
  }

  // Jos tänne asti päästiin, ei ammus osunut.
  return false;
}

exports.Bullet = Bullet;
exports.Weapons = Weapons;
