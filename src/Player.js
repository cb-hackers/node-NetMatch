/**
 * @fileOverview Sisältää {@link Player}-luokan toteutuksen.
 */

"use strict";

/**#nocode+*/
var log = require('./Utils').log
  , rand = require('./Utils').rand
  , Obj = require('./Object')
  , WPN = require('./Constants').WPN
  , NET = require('./Constants').NET
  , Weapons = require('./Weapon');
/**#nocode-*/

/**
 * Luo uuden pelaajan.
 *
 * @class Kaikki pelaajat, niin ihmispelaajat kuin botitkin, ovat tämän luokan jäseniä.
 *
 * @param {Server} server  NetMatch-palvelin, joka pyörittää pelaajaa
 * @param {Byte} playerId  Luotavan pelaajan ID
 *
 * @extends Obj
 *
 * @property {Integer} id            Pelaajan tunnus välillä 1-MAX_PLAYERS
 * @property {String}  clientId      ClientId eli ip-osoite ja tunnus
 * @property {Integer} active        Onko tämä pelaaja pelissä
 * @property {Integer} loggedIn      Pelaaja on kirjautunut
 * @property {String}  name          Pelaajan nimimerkki
 * @property {String}  statName      Pelaajan nimimerkki
 * @property {String}  botName       Botin nimi
 * @property {Integer} lastActivity  Koska viimeksi pelaajalta on saatu dataa
 * @property {Integer} x             Sijainti
 * @property {Integer} y             Sijainti
 * @property {Integer} angle         Kulma
 * @property {Integer} passCount     Kunka monta kierrosta pelaaja on ollut päivittämättä
 * @property {Float}   prevPosX      Pelaajan edellinen sijainti
 * @property {Integer} lastValidX    Viimeisin paikka jossa pelaaja on varmasti ollut kentällä
 * @property {Integer} lastValidY    Viimeisin paikka jossa pelaaja on varmasti ollut kentällä
 * @property {Integer} weapon        Käytössä oleva ase
 * @property {Integer} lastShoot     Koska on viimeksi ammuttu
 * @property {Integer} health        Terveys
 * @property {Integer} prevHealth    Terveys edellisellä kierroksella
 * @property {Integer} kills         Tappojen lukumäärä
 * @property {Integer} deaths        Kuolemien lukumäärä
 * @property {Float}   killRatio     Tapposuhde
 * @property {Boolean} isDead        Onko pelaaja kuollut
 * @property {Integer} timeToDeath   Kuolinaika
 * @property {Integer} zombie        Onko tämä pelaaja botti
 * @property {Player}  shootedBy     Kuka on viimeksi ampunut pelaajaa
 * @property {Integer} hasAmmos      Onko pelaajalla ammuksia nykyisessä aseessa
 * @property {Byte}    team          Joukkue
 * @property {String}  mapName       Pelaajalla ladattuna oleva kartta
 * @property {Integer} outOfMap      Kuinka monta päivityskierrosta pelaaja on ollut poissa kartalta
 * @property {Integer} spawnTime     Syntymäaika
 * @property {Integer} visible       Ukon vilkuttaminen syntymän jälkeen
 * @property {Byte}    admin         Onko pelaaja admin vai ei
 * @property {Byte}    kicked        Onko pelaaja potkittu pois
 * @property {String}  kickReason    Mikä syy on annettu potkuille
 * @property {Player}  kicker        Kuka potkaisi
 * @property {Integer} hackTestX     Pelaajan viimeisin sijainti nopeuden tarkistuksessa
 * @property {Integer} hackTestY     Pelaajan viimeisin sijainti nopeuden tarkistuksessa
 * @property {Integer} lag           Pelaajan lagi millisekunneissa
 * @property {Integer} spHackTimer   Viimeisimmässä nopeuden tarkistuksessa otettu Timer()
 * @property {Byte}    handShooted   Kummalla kädellä on viimeksi ammuttu (pistooli) 0=vasen 1=oikea
 * @property {Boolean} sendNames     Pelaaja pyysi palvelimelta pelaajien nimilistauksen, lähetään kivasti myös itemien tiedot ":D"
 */
function Player(server, playerId) {
  Obj.call(this, 0, 0, 0);
  var botNames = server.gameState.map.config.botNames;

  this.server = server;

  // Alustetaan pelaaja
  this.id = playerId;
  this.team = 1;
  if (botNames.length < playerId) {
    // Bottien nimiä ei ollut kaikkia määritelty kartan tiedoissa
    this.botName = "Bot_" + playerId;
  } else {
    this.botName = botNames[playerId-1];
  }
  this.clientId = "";
  this.name = "";
  this.kickReason = "";
  this.spawnTime = 0;

  // Lisätään tämä palvelimen players-kokoelmaan ja poistetaan vanha, jos sellainen oli olemassa.
  if (server.players.hasOwnProperty(playerId)) {
    delete server.players[playerId];
  }
}
Player.prototype = new Obj();
Player.prototype.constructor = Player;

/**
 * Tappaa pelaajan.
 * @param {Bullet} [bullet]  Tappajapelaajan ammus, joka hoiti viimeistelyn. Jos tätä ei anneta,
 *                           uskotellaan että pelaaja teki itsemurhan pistoolilla.
 */
Player.prototype.kill = function (bullet) {
  var killer, weapon;

  if (this.server.config.logKillMessages) {
    // Logataan kuka tappoi kenet.
    if (bullet && this.server.players[bullet.player.id].name !== this.name) {
      log.info('%0 was killed by player %1', this.name.green,
        this.server.players[bullet.player.id].name.green, String(bullet.id).magenta);
    } else {
      log.info('%0 committed suicide.', this.name.green);
    }
  }

  this.isDead = true;
  this.timeToDeath = Date.now();
  this.deaths++;
  this.health = 0;

  if (!bullet) {
    killer = this; // Itsemurha
    weapon = WPN.PISTOL;
  } else {
    killer = this.server.players[bullet.player.id];
    weapon = bullet.weapon;
  }

  // Onko tappaja vielä pelissä
  if (killer.active) {
    if (killer.id === this.id || (killer.team === this.team && this.server.gameState.gameMode > 1)) {
      // Teamkilleri tai itsemurha, vähennetään tappo.
      killer.kills--;
    } else {
      // Tapettiin vastustaja, lisätään tappo.
      killer.kills++;
    }

    // Lähetetään tappoviesti
    this.server.messages.addToAll({
      msgType: NET.KILLMESSAGE, // Mikä viesti
      weapon: weapon,           // Millä aseella tapettiin
      player: killer,           // Tappaja
      player2: this             // Uhri
    });
  }
};

/**
 * Vahingoittaa pelaajaa räjähdyksen etäisyyden arvoisesti
 *
 * @param {Bullet} bullet  Ammus, joka räjähtää pelaajan lähellä
 * @param {Number} dist    Räjähdyksen etäisyys pelaajasta
 */
Player.prototype.applyExplosion = function (bullet, dist) {
  if (this.health <= 0 || this.isDead) {
    return;
  }
  var damageRange = Weapons[bullet.weapon].damageRange;

  if (this.server.debug > 1) {
    log.debug('Applying explosion from %0 (%1) to %2',
      String(bullet.id).magenta, Weapons[bullet.weapon].name.yellow, this.name.green);
  }

  // Uhrille tieto ampujasta
  this.shootedBy = bullet.player;

  // Lasketaan vahingon määrä, joka riippuu etäisyydestä räjähdykseen, räjähdyksen laajuudesta ja
  // räjähtäneen ammuksen damage-kentän arvosta.
  this.health -= ((damageRange - dist) / damageRange) * Weapons[bullet.weapon].damage;

  // Tarkistetaan kuolema
  if (this.health <= 0) {
    this.kill(bullet);
  }
};

/**
 * Tätä funktiota kutsutaan kun ammus osuu suoraan pelaajaan. Tämä hoitaa pelaajan vahingoittamisen.
 *
 * @param {Bullet} bullet  Ammus joka osui pelaajaan
 * @param {Number} x       Osumakohta
 * @param {Number} y       Osumakohta
 */
Player.prototype.bulletHit = function (bullet, x, y) {
  if (this.health <= 0 || this.isDead) {
    return;
  }
  // Talletetaan tieto ampujasta
  this.shootedBy = bullet.player.id;

  // Lisätään viestijonoon ilmoitus osumasta
  this.server.messages.addToAll({
    msgType: NET.BULLETHIT, // Mikä viesti
    bullet: bullet,         // Ammuksen tunnus
    player: this,           // Keneen osui
    x: x,                   // Missä osui
    y: y,                   // Missä osui
    weapon: bullet.weapon   // Millä aseella ammus ammuttiin
  });

  // Tutkitaan oliko räjähdys ja jos oli, niin meillä ei ole täällä enää muuta tehtävää.
  if (bullet.checkExplosion(x, y)) {
    return;
  }

  // Ei ollut räjähdys, tiputetaan pelaajan health-kentän arvoa
  this.health -= Weapons[bullet.weapon].damage;

  // Kuolema?
  if (this.health <= 0) {
    this.kill(bullet);
  }
};

/** Asettaa pelaajan tasaisesti johonkin joukkueeseen. */
Player.prototype.setTeamEvenly = function () {
  var server = this.server
    , reds = 0, greens = 0;

  // Deathmatch-moodissa kaikki pelaajat ovat vihreillä
  if (server.gameState.gameMode === 1) {
    this.team = 1;
    return;
  }

  if (server.gameState.gameMode === 3) {
    // Zombie-moodi, kaikki botit ovat punaisilla ja ihmispelaajat vihreillä
    if (this.zombie) {
      this.team = 2;
    } else {
      this.team = 1;
    }
    return;
  }

  // Lasketaan pelaajien määrä molemmissa joukkueissa
  server.loopPlayers(function playerSetTeamEvenly(plr) {
    if (!plr.loggedIn) { return; }
    if (plr.team === 1) {
      greens++;
    } else {
      reds++;
    }
  });

  if (greens < reds) {
    this.team = 1;
  } else if (reds < greens) {
    this.team = 2;
  } else {
    this.team = rand(1, 2);
  }
};

module.exports = Player;
