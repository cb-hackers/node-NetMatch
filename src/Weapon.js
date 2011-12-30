/**
 * @fileOverview Sisältää {@link Weapon}-luokan toteutuksen sekä {@link Server#bullets} kokoelman.
 */

/**#nocode+*/
var log = require('./Utils').log
  , timer = require('./Utils').timer
  , rand = require('./Utils').rand
  , NET = require('./Constants').NET
  , WPN = require('./Constants').WPN
  , WPNF = require('./Constants').WPNF;
/**#nocode-*/

/**
 * @namespace Sisältää aseet ja niiden ominaisuudet
 */
var Weapons = [
  // Aseet alkavat vasta ID:stä 1
  null,
  /**
   * Pistooli
   * @name Weapons[WPN.PISTOL]
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
    weight: 100
  },
  /**
   * Konekivääri
   * @name Weapons[WPN.MGUN]
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
    weight: 100
  },
  /**
   * Sinko
   * @name Weapons[WPN.BAZOOKA]
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
    weight: 115
  },
  /**
   * Haulikko
   * @name Weapons[WPN.SHOTGUN]
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
    weight: 100
  },
  /**
   * Kranaatinlaukaisin
   * @name Weapons[WPN.LAUNCHER]
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
    weight: 110
  },
  /**
   * Moottorisaha
   * @name Weapons[WPN.CHAINSAW]
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
    weight: 90
  }
];

/**
 * Luo uuden ammuksen.
 *
 * @class Kaikki pelaajat, niin ihmispelaajat kuin botitkin, ovat tämän luokan jäseniä.
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
  if ('undefined' === typeof extraBullet) {
    extraBullet = 0;
  }
  var player
    , weaponConfig
    , bPos
    , spread
    , randomSpread
    , msgData
    , playerIds
    , plr;

  // UNIMPLEMENTED
  // Ei tehdä ammusta jos erä on päättynyt

  // Haetaan pelaaja joka ampui
  player = server.players[playerId];
  // Luodaan ammus
  this.bulletId = ++server.lastBulletId;  // Ammuksen tunnus
  this.weapon = player.weapon;            // Millä aseella ammuttu
  this.playerId = playerId;               // Kuka ampui
  this.timeShooted = timer();             // Koska ammuttu
  this.moved = 0;
  this.x = player.x;
  this.y = player.y;
  this.angle = player.angle;

  weaponConfig = Weapons[player.weapon];

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

  // Lisätään palvelimen bullets-listaan tämä ammus
  server.bullets.push(this);

  // Lisätään ammusviesti lähetettäväksi jokaiselle pelaajalle
  msgData = {
    msgType: NET.NEWBULLET,
    bulletId: this.bulletId,
    sndPlay: !extraBullet,
    weapon: player.weapon,
    playerId: playerId,
    x: this.x,
    y: this.y,
    handShooted: player.handShooted
  };
  playerIds = Object.keys(server.players);
  for (var i = playerIds.length; i--;) {
    plr = server.players[playerIds[i]];
    if (plr.active && !plr.zombie) {
      server.messages.add(plr.playerId, msgData);
    }
  }

  if (player.weapon === WPN.LAUNCHER && !extraBullet) {
    // Jos tämä on ammuttu kranaatinheittimellä niin tehdään vielä toinen ammus koska 2 kranaattia
    new Bullet(server, playerId, 1);
  }

  // Haulikosta lähtee monta kutia
  if (player.weapon === WPN.SHOTGUN && extraBullet < 6) {
    new Bullet(server, playerId, extraBullet + 1);
  }
}


exports.Bullet = Bullet;
exports.Weapons = Weapons;
