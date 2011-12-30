/**
 * @fileOverview Pitää sisällään eri vakioita: {@link NET}
 */

/*
// Voit kutsua tätä näin:
var C = require('./Constants);
console.log(C.NET.LOGIN);

// Tai näin:
var NET = require('./Constants).NET;
console.log(NET.LOGIN);
*/

// CoolBasic vakiot JS-muotoon alla olevalla regexillä:
//   Etsi: Const [A-Z]+_([A-Z_0-9]+) += +([0-9]+) +// *(.+)
//   Korvaa: /** \3 */\n\1: \2,\n

/**
 * @namespace Viestityypit
 */

var NET = {
  /** Kirjautuminen peliin */
  LOGIN: 1,

  /** Poistuminen */
  LOGOUT: 2,

  /** Kirjautuminen epäonnistui */
  LOGINFAILED: 3,

  /** Kirjautuminen onnistui */
  LOGINOK: 4,

  /** Väärä ohjelmaversio */
  WRONGVERSION: 5,

  /** Pelissä on liikaa pelaajia */
  TOOMANYPLAYERS: 6,

  /** Pelaaja ei ole kirjautunut oikein */
  NOLOGIN: 7,

  /** Pelaajadataa */
  PLAYER: 8,

  /** Uusi ammus */
  NEWBULLET: 9,

  /** Pelaajan nimi */
  PLAYERNAME: 10,

  /** Tekstiviesti */
  TEXTMESSAGE: 11,

  /** Ammus osui johonkin pelaajaan */
  BULLETHIT: 12,

  /** Tutka */
  RADAR: 13,

  /** Poimittava tavara */
  ITEM: 14,

  /** Tappoviesti */
  KILLMESSAGE: 15,

  /** Pelisession aikatiedot */
  SESSIONTIME: 16,

  /** Client on bannattu */
  BANNED: 17,

  /** Kartan vaihto */
  MAPCHANGE: 18,

  /** Pelaajan potkiminen servulta */
  KICKED: 19,

  /** Palvelimen generoima viesti */
  SERVERMSG: 20,

  /** Liittyessä ei saa olla sama nimimerkki jo käytössä */
  NICKNAMEINUSE: 21,

  /** Lähetetään kaikille tieto että palvelin sammutetaan. */
  SERVERCLOSING: 22,

  /** Pelaajan joukkueesta tieto. */
  TEAMINFO: 23,

  /** Nopeuden huijaus havaittu */
  SPEEDHACK: 24,

  /** Viestin loppu */
  END: 255
}

/**
 * @namespace Aseet
 */
var WPN = {
  /** Pistooli */
  PISTOL: 1,

  /** Konepistooli */
  MGUN: 2,

  /** Sinko */
  BAZOOKA: 3,

  /** Haulikko */
  SHOTGUN: 4,

  /** Kranaatinlaukaisin */
  LAUNCHER: 5,

  /** Moottorisaha */
  CHAINSAW: 6,

  /** Aseiden lukumäärä */
  COUNT: 6
}

/**
 * @namespace Aseiden ominaisuudet
 */
var WPNF = {
  /** Pelihahmon objekti */
  CHARACTER: 1,

  /** Aseen latausaika */
  RELOADTIME: 2,

  /** Ammusobjekti */
  BULLET: 3,

  /** Ampumisen ääni */
  SHOOTSOUND: 4,

  /** Osuman ääni */
  HITSOUND: 5,

  /** Ammuksen lentonopeus */
  BULLETSPEED: 6,

  /** Ammuksen lähtöpaikka pelaajan etupuolella */
  BULLET_FORTH: 7,

  /** Ammuksen lähtöpaikka sivusuunnassa */
  BULLET_YAW: 8,

  /** Ammuksen aiheuttama tuho */
  DAMAGE: 9,

  /** Tuhoalueen laajuus */
  DAMAGERANGE: 10,

  /** Hajonta asteina */
  SPREAD: 11,

  /** Animaatiokuva kun osuu */
  ANIM_IMAGE: 12,

  /** Animaation pituus */
  ANIM_LENGTH: 13,

  /** Animaation viive */
  ANIM_DELAY: 14,

  /** Aseen infokuva */
  IMAGE: 15,

  /** Aseessa olevat ammukset */
  AMMO: 16,

  /** Ammusten maksimimäärä */
  AMMO_MAX: 17,

  /** Suuliekkianimaatio */
  FIRE: 18,

  /** Missä kohdassa suuliekki näytetään (pituussuunnassa) */
  FIREPOS: 19,

  /** Pieni ikoni tappoviesteihin */
  ICON: 20,

  /** Kuinka paljon tavaraa saa poimittaessa */
  PICKCOUNT: 21,

  /** Näppäin jolla tämä ase valitaan */
  KEY: 22,

  /** Etäisyys jonka alle kohteesta oleva botti ei ammu */
  SAFERANGE: 23,

  /** Etäisyys jonka alle kohteesta oleva botti ampuu */
  SHOOTRANGE: 24,

  /** Pelihahmon objekti (tiimi 2) */
  CHARACTER2: 25,

  /** Aseen paino, vaikuttaa liikkumisen nopeuteen. 100=normaali */
  WEIGHT: 26,

  /** Tietoalkioiden lukumäärä */
  COUNT: 26
}

/**
 * @namespace Objektit. Näistä on varmaan moni turhia palvelinpuolella.
 */
var OBJ = {
  /** Pistoolimies */
  PLAYER1: 1,

  /** Konekiväärimier */
  PLAYER2: 2,

  /** Sinkomies */
  PLAYER3: 3,

  /** Pistoolin ammus */
  AMMO1: 4,

  /** Konekiväärin ammus */
  AMMO2: 5,

  /** Singon ammus */
  AMMO3: 6,

  /** Vasen jalka */
  FOOT_LEFT: 7,

  /** Oikea jalka */
  FOOT_RIGHT: 8,

  /** Tutka */
  RADAR: 9,

  /** Ruumiinosia */
  PART1: 10,

  /** Ruumiinosia */
  PART2: 11,

  /** Ruumiinosia */
  PART3: 12,

  /** Ruumiinosia */
  PART4: 13,

  /** Ruumiinosia */
  PART5: 14,

  /** Suuliekki */
  FIRE1: 15,

  /** Suuliekki */
  FIRE2: 16,

  /** Suuliekki */
  FIRE3: 17,

  /** Healthpack */
  ITEM_HEALTH: 18,

  /** Kk:n ammuksia */
  ITEM_AMMO: 19,

  /** Singon ammuksia */
  ITEM_ROCKET: 20,

  /** Moottorisahan bensaa */
  ITEM_FUEL: 21,

  /** Verta */
  BLOOD1: 22,

  /** Verta */
  BLOOD2: 23,

  /** Verta */
  BLOOD3: 24,

  /** Verta */
  BLOOD4: 25,

  /** Verta */
  BLOOD5: 26,

  /** Verta */
  BLOOD6: 27,

  /** Verta */
  BLOOD7: 28,

  /** Verta */
  BLOOD8: 29,

  /** Moottorisahamies */
  PLAYER4: 30,

  /** Haulikkomies */
  PLAYER5: 31,

  /** Kranaattimies */
  PLAYER6: 32,

  /** Haulikon ammuksia */
  ITEM_SHOTGUN: 33,

  /** Kranaatteja */
  ITEM_LAUNCHER: 34,

  /** Kranaatti */
  AMMO6: 35,

  /** Tyhjä */
  NULL: 36,

  /** Ruumiinosia */
  PART2_2: 37,

  /** Ruumiinosia */
  PART3_2: 38,

  /** Ruumiinosia */
  PART4_2: 39,

  /** Ruumiinosia */
  PART5_2: 40,

  /** Pistoolimies */
  PLAYER1_2: 41,

  /** Konekiväärimier */
  PLAYER2_2: 42,

  /** Sinkomies */
  PLAYER3_2: 43,

  /** Moottorisahamies */
  PLAYER4_2: 44,

  /** Haulikkomies */
  PLAYER5_2: 45,

  /** Kranaattimies */
  PLAYER6_2: 46,

  /** Tutka */
  RADAR2: 47,

  /** Objektien lukumäärä */
  COUNT: 47
}

/**
 * @namespace Itemit omana kokoelmanaan eroteltuna OBJ kokoelmasta.
 */
var ITEM = {
  /** Healthpack */
  HEALTH: 18,

  /** Konekiväärin ammuksia */
  AMMO: 19,

  /** Singon ammuksia */
  ROCKET: 20,

  /** Moottorisahan bensaa */
  FUEL: 21,

  /** Haulikon ammuksia */
  SHOTGUN: 33,

  /** Kranaatteja */
  LAUNCHER: 34
}

exports.NET = NET;
exports.WPN = WPN;
exports.WPNF = WPNF;
exports.OBJ = OBJ;
exports.ITEM = ITEM;
