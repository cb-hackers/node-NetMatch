/**
 * @fileOverview Sisältää {@link Player}-luokan toteutuksen.
 */

/**#nocode+*/
var log = require('./Utils').log
  , Obj = require('./Object')
  , WPN = require('./Constants').WPN
  , NET = require('./Constants').NET
  , Weapons = require('./Weapon').Weapons;
/**#nocode-*/

/**
 * Luo uuden pelaajan.
 *
 * @class Kaikki pelaajat, niin ihmispelaajat kuin botitkin, ovat tämän luokan jäseniä.
 *
 * @param {Server} server  NetMatch-palvelin, joka pyörittää pelaajaa
 * @param {Byte} playerId  Luotavan pelaajan ID
 *
 * @property {Integer} playerId      Pelaajan tunnus välillä 1-MAX_PLAYERS
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
 * @property {Integer} obj           Pelihahmo
 * @property {Integer} leftLegObj    Vasen jalka
 * @property {Integer} rightLegObj   Oikea jalka
 * @property {Integer} fireObj       Suuliekkianimaatio
 * @property {Integer} fireObj2      Suuliekkianimaatio (toinen pistooli)
 * @property {Integer} showFire      Näytetäänkö suuliekki
 * @property {Float}   prevPosX      Pelaajan edellinen sijainti
 * @property {Float}   prevPosY      Pelaajan edellinen sijainti
 * @property {Float}   legPos        Jalkojen asento kävelyanimaatiossa
 * @property {Integer} lastValidX    Viimeisin paikka jossa pelaaja on varmasti ollut kentällä
 * @property {Integer} lastValidY    Viimeisin paikka jossa pelaaja on varmasti ollut kentällä
 * @property {Integer} weapon        Käytössä oleva ase
 * @property {Integer} lastShoot     Koska on viimeksi ammuttu
 * @property {Integer} lastSound     Koska on viimeksi soitettu ampumisääni (käytetään moottorisahassa)
 * @property {Integer} health        Terveys
 * @property {Integer} prevHealth    Terveys edellisellä kierroksella
 * @property {Integer} kills         Tappojen lukumäärä
 * @property {Integer} deaths        Kuolemien lukumäärä
 * @property {Float}   killRatio     Tapposuhde
 * @property {Boolean} isDead        Onko pelaaja kuollut
 * @property {Integer} timeToDeath   Kuolinaika
 * @property {Integer} zombie        Onko tämä pelaaja botti
 * @property {Float}   nextAngle     Kulma johon botin pitäisi liikkua
 * @property {Float}   lastAngle     Kuinka paljon botin ja kohdekulman ero oli edellisellä kierroksella
 * @property {Float}   rotation      Tällä käännetään objektia (TurnObject)
 * @property {Float}   sideStep      Botin sivuaskeleet
 * @property {integer} nextAction    Ajankohta jolloin botille arvotaan uusi suunta
 * @property {Integer} tooClose      Botti on liian lähellä seinää tai toista pelaajaa
 * @property {Float}   fightRotate   Kääntymisnopeus kun ollaan havaittu vastustaja
 * @property {Float}   shootingAngle Ammutaan kun uhri on tämän kulman sisällä botin edessä
 * @property {Integer} shootedBy     Kuka on viimeksi ampunut pelaajaa
 * @property {Float}   fov           Field of View
 * @property {Integer} idleSound     Esim. moottorisahan tyhjäkäynti
 * @property {Integer} idleTimer     Koska soitettu viimeksi
 * @property {Integer} hasAmmos      Onko pelaajalla ammuksia nykyisessä aseessa
 * @property {Byte}    team          Joukkue
 * @property {String}  mapName       Pelaajalla ladattuna oleva kartta
 * @property {Integer} outOfMap      Kuinka monta päivityskierrosta pelaaja on ollut poissa kartalta
 * @property {Integer} spawnTime     Syntymäaika
 * @property {Integer} visible       Ukon vilkuttaminen syntymän jälkeen
 * @property {Byte}    admin         Onko pelaaja admin vai ei
 * @property {Byte}    kicked        Onko pelaaja potkittu pois
 * @property {String}  kickReason    Mikä syy on annettu potkuille
 * @property {Byte}    kickerId      Kuka potkaisi
 * @property {Integer} hackTestX     Pelaajan viimeisin sijainti nopeuden tarkistuksessa
 * @property {Integer} hackTestY     Pelaajan viimeisin sijainti nopeuden tarkistuksessa
 * @property {Integer} lag           Pelaajan lagi millisekunneissa
 * @property {Integer} spHackTimer   Viimeisimmässä nopeuden tarkistuksessa otettu Timer()
 * @property {Byte}    handShooted   Kummalla kädellä on viimeksi ammuttu (pistooli) 0=vasen 1=oikea
 * @property {Boolean} sendNames     Pelaaja pyysi palvelimelta pelaajien nimilistauksen, lähetään kivasti myös itemien tiedot ":D"
 */
function Player(server, playerId) {
  Obj.call(this, 0, 0, 0);
  this.server = server;

  // Alustetaan pelaaja
  this.playerId = playerId;
  this.team = 1;
  this.botName = server.gameState.map.config.botNames[playerId];
  this.clientId = "";
  this.name = "";
  var skill = 21 - playerId; // Botteja hieman eritasoisiksi vissiinkin?
  this.fightRotate = 1.5 + (skill / 1.5);
  this.shootingAngle = 4.0 + (playerId * 1.5);
  this.fov = 100 + (skill * 3.5);
  this.kickReason = "";

  // Lisätään tämä palvelimen players-kokoelmaan ja poistetaan vanha, jos sellainen oli olemassa.
  if (server.players.hasOwnProperty(playerId)) {
    delete server.players[playerId];
  }
  server.players[playerId] = this;
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

  if (this.server.debug) {
    if (!bullet) {
      log.write('Player %0 committed suicide.', this.name);
    } else {
      log.write('Player %0 was killed by player %1 with bullet %2 (%3)', this.name.green,
        this.server.players[bullet.playerId].name.green, String(bullet.bulletId).magenta,
        Weapons[bullet.weapon].name.yellow);
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
    killer = this.server.players[bullet.playerId];
    weapon = bullet.weapon;
  }

  // Onko tappaja vielä pelissä
  if (killer.active) {
    if (killer.playerId == this.playerId || (killer.team === this.team && this.server.gameState.playMode > 1)) {
      // Teamkilleri tai itsemurha, vähennetään tappo.
      killer.kills--;
    } else {
      // Tapettiin vastustaja, lisätään tappo.
      killer.kills++;
    }

    // Lähetetään tappoviesti
    this.server.messages.addToAll({
      msgType: NET.KILLMESSAGE,   // Mikä viesti
      weapon: weapon,             // Millä aseella tapettiin
      playerId: killer.playerId,  // Tappaja
      playerId2: this.playerId    // Uhri
    });
  }
}

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

  if (this.server.debug) {
    log.info('Applying explosion from bullet %0 (%1) to %2',
      String(bullet.bulletId).magenta, Weapons[bullet.weapon].name.yellow, this.name.green);
  }

  // Uhrille tieto ampujasta
  this.shootedBy = bullet.playerId;

  // Lasketaan vahingon määrä, joka riippuu etäisyydestä räjähdykseen, räjähdyksen laajuudesta ja
  // räjähtäneen ammuksen damage-kentän arvosta.
  this.health -= ((damageRange - dist) / damageRange) * Weapons[bullet.weapon].damage;

  // Tarkistetaan kuolema
  if (this.health <= 0) {
    this.kill(bullet);
  }
}

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
  this.shootedBy = bullet.playerId;

  // Lisätään viestijonoon ilmoitus osumasta
  this.server.messages.addToAll({
    msgType: NET.BULLETHIT,     // Mikä viesti
    bulletId: bullet.bulletId,  // Ammuksen tunnus
    playerId: this.playerId,    // Keneen osui
    x: x,                       // Missä osui
    y: y,                       // Missä osui
    weapon: bullet.weapon       // Millä aseella ammus ammuttiin
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
}

exports = module.exports = Player;
