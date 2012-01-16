/**
 * @fileOverview Sisältää {@link Bullet}-luokan toteutuksen.
 */

/**#nocode+*/
var log = require('./Utils').log
  , rand = require('./Utils').rand
  , distance = require('./Utils').distance
  , NET = require('./Constants').NET
  , WPN = require('./Constants').WPN
  , Obj = require('./Object')
  , Weapons = require('./Weapon');
/**#nocode-*/

/**
 * Luo uuden ammuksen.
 *
 * @class Ammus
 *
 * @param {Server} server  Palvelimen sisältävä muuttuja, instanssi luokasta {@link Server}.
 * @param {Player} player  Pelaaja joka ampui ammuksen
 * @param {Integer} newId  Uuden ammuksen ID
 * @param {Boolean} [mirrored=false]  Peilataanko ammuksen lähtösuunta (kranaatinlaukaisimen 2. ammus)
 *
 * @extends Obj
 *
 * @property {Short}   id           Ammuksen tunnus
 * @property {Player}  player       Kuka ampui
 * @property {Byte}    weapon       Millä aseella tämä on ammuttu
 * @property {Integer} x            Paikkatietoa
 * @property {Integer} y            Paikkatietoa
 * @property {Integer} angle        Ammuksen kulma
 * @property {Float}   prevPosX     Ammuksen edellinen paikka
 * @property {Float}   prevPosY     Ammuksen edellinen paikka
 * @property {Byte}    moved        Onko ammusta vielä liikutettu yhtään
 * @property {Integer} timeShooted  Milloin ammus on ammuttu
 */
function Bullet(server, player, newId, mirrored) {
  Obj.call(this, 0, 0, 0);

  this.server = server;

  // Jos pelaaja on nakkina niin ei anneta sen luoda uutta ammusta
  if (player.spawnTime + server.config.spawnProtection > Date.now()) {
    this.failed = true;
    return;
  }

  // Luodaan ammus
  this.id = newId;
  this.player = player;
  this.weapon = player.weapon;
  this.timeShooted = Date.now();
  this.moved = 0;
  this.x = player.x;
  this.y = player.y;
  this.angle = player.angle;
  this.mirrored = !!mirrored;
}
Bullet.prototype = new Obj();
Bullet.prototype.constructor = Bullet;

/**
 * Alustaa ammuksen.
 *
 * @returns {Boolean}  Onnistuiko ammuksen alustus. Jos palautusarvo on false, ei ammusta tulisi
 *                     lisätä palvelimelle muistiin.
 */
Bullet.prototype.initialize = function () {
  var weaponConfig
    , bPos
    , spread
    , randomSpread;

  // UNIMPLEMENTED
  // Ei tehdä ammusta jos erä on päättynyt

  if ('undefined' === typeof this.player) {
    log.error("Tried to shoot a bullet from an undefined player!");
    return false;
  }

  weaponConfig = Weapons[this.weapon];

  // Debugataan
  if (this.server.debug > 1) {
    log.debug('Created bullet %0 (%1), shot by %2',
      String(this.id).magenta, weaponConfig.name.yellow, this.player.name.green);
  }
  // Mistä ammus lähtee pelaajaan nähden
  bPos = weaponConfig.bulletYaw;
  if (this.weapon === WPN.PISTOL) {
    if (!this.player.handShooted) {
      bPos = -bPos;
      this.player.handShooted = 1;
    } else {
      this.player.handShooted = 0;
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
  if (this.weapon === WPN.LAUNCHER) {
    if (this.mirrored) {
      spread = -spread;
    }
  } else {
    spread = rand(-spread, spread);
  }

  this.angle += spread;
  if (this.weapon === WPN.SHOTGUN) {
    randomSpread = rand(0, 20);
    this.x += Math.cos((this.angle / 180) * Math.PI) * randomSpread;
    this.y += Math.sin((this.angle / 180) * Math.PI) * randomSpread;
  }

  // Tarkista että onko ammus kartan sisällä ja liikuttele taaksepäin kunnes ei ole
  for (var i = 50; i--; true) {
    if (!this.server.gameState.map.isColliding(this.x, this.y)) {
      break;
    }
    this.x -= Math.cos((this.angle / 180) * Math.PI);
    this.y -= Math.sin((this.angle / 180) * Math.PI);
  }
  // Jos mentiin edellinen for-looppi loppuun asti, niin failataan ammuksen luonti.
  if (i < 0) {
    if (!this.player.zombie || this.server.debug) {
      // Jos kyseessä oli ihmispelaaja niin heitetään varoitusta (tai jos debug)
      log.warn("Player %0 tried to shoot a bullet while inside of a wall!", this.player.name.green);
    }
    return false;
  }

  // Jos tänne asti päästiin, on ammus alustettu onnistuneesti
  return true;
};

/**
 * Päivittää yksittäisen ammuksen.
 */
Bullet.prototype.update = function () {
  var weaponConfig = Weapons[this.weapon]
    , speed = weaponConfig.bulletSpeed // Nopeus riippuu siitä, millä aseella ammus on ammuttu
    , hit = false
    , playerIds;

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
      bullet: this,            // Ammuksen tunnus
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

    playerIds = Object.keys(this.server.players);
    for (var i = playerIds.length; i--; true) {
      hit = this.checkPlayerHit(this.server.players[playerIds[i]]);
      if (hit) {
        break;
      }
    }

  }

  if (hit) {
    // Jos ollaan törmätty johonkin, poistetaan ammus.
    if (this.server.debug > 1) {
      log.debug('Deleted bullet %0 (%1).', String(this.id).magenta, weaponConfig.name.yellow);
    }
    delete this.server.bullets[this.id];
  } else {
    this.prevPosX = this.x;
    this.prevPosY = this.y;
  }
};

/**
 * Tutkii onko pelaajia räjähdyksen vaikutusalueella. Tai moottorisahan (lol?).
 *
 * @param {Number} [x=this.x]  Tarkistuspisteen x-koordinaatti
 * @param {Number} [y=this.y]  Tarkistuspisteen y-koordinaatti
 *
 * @returns {Boolean} Räjähtikö ammus
 */
Bullet.prototype.checkExplosion = function (x, y) {
  var damageRange = Weapons[this.weapon].damageRange
  , playerIds
  , player
  , isProtected
  , dist
  , checkRange;

  // Poistutaan jos ammus ei ole räjähtävää mallia
  if (!damageRange) {
    return false;
  }

  // Tarkistetaan, onko annettu x- ja y-koordinaatit parametreina
  if ('number' !== typeof x || 'number' !== typeof y) {
    x = this.x;
    y = this.y;
  }

  if (this.server.debug > 1) {
    log.debug('Checking explosion from %0 (%1) at (%2, %3).',
      String(this.id).magenta, Weapons[this.weapon].name.yellow,
      this.x.toFixed(1).blue, this.y.toFixed(1).blue);
  }

  playerIds = Object.keys(this.server.players);
  for (var i = playerIds.length; i--; true) {
    player = this.server.players[playerIds[i]];
    isProtected = (player.spawnTime + this.server.config.spawnProtection > Date.now());
    // Onko pelaaja aktiivinen, hengissä eikä suojattu
    if (player.active && player.health > 0 && !isProtected) {
      dist = distance(x, y, player.x, player.y);
      checkRange = true;

      if (this.weapon === WPN.CHAINSAW && this.player === player) {
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
};

/**
 * Tutkii osuiko ammus pelaajaan.
 * @param {Player} player  Pelaaja, kehen tarkistus kohdistuu.
 * @returns {Boolean} Osuiko vai eikö
 */
Bullet.prototype.checkPlayerHit = function (player) {
  var isProtected = (player.spawnTime + this.server.config.spawnProtection > Date.now())
    , move
    , xMove
    , yMove
    , steps
    , stp
    , bPos
    , bx
    , by;
  // Osuma tutkitaan vain jos pelaaja on aktiivinen ja hengissä
  if (!isProtected && player.active && player.health > 0) {
    move = distance(this.prevPosX, this.prevPosY, this.x, this.y);
    xMove = (this.x - this.prevPosX) / move;
    yMove = (this.y - this.prevPosY) / move;

    // Ammus on voinut kulkea yhden framen aikana paljonkin joten tutkitaan siirtymää vähitellen.
    steps = Math.ceil(move / 5);
    if (steps > 0) {
      // Tutkitaan välipisteet
      stp = move / steps;
      for (var i = 1; i <= steps; i++) {
        bPos = i * stp;
        bx = this.prevPosX + (xMove * bPos);
        by = this.prevPosY + (yMove * bPos);

        // Nyt tarkistetaan osuma. Osumaa itseensä ei tarkisteta
        if (player !== this.player && distance(player.x, player.y, bx, by) < 20) {
          // Osui
          player.bulletHit(this, bx, by);
          return true;
        }
      }
    }
  }

  // Jos tänne asti päästiin, ei ammus osunut.
  return false;
};

module.exports = Bullet;
