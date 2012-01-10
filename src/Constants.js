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
};

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
};

/**
 * @namespace Itemit omana kokoelmanaan eroteltuna OBJ kokoelmasta.
 */
var ITM = {
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
};

exports.NET = NET;
exports.WPN = WPN;
exports.ITM = ITM;
