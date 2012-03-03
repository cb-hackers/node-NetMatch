/**
 * @fileOverview Pitää sisällään asetuksiin liittyvät toiminnot ja oletusasetusten nimiavaruuden.
 * Kts. {@link Config} ja {@link Config.defaults}
 */

"use strict";

/**#nocode+*/
var log = require('./Utils').log
  , cjson = require('cjson')
  , path = require('path')
  , colors = require('colors');
/**#nocode-*/

/**
 * Alustaa luokan käyttöä varten, lataa {@link Config.defaults} kentät tämän instanssin kentiksi
 * @class Asetukset
 *
 * @param {Server} server  NetMatch-palvelin, joka kutsuu tätä konstruktoria
 */
function Config(server) {
  this.server = server;

  // Laajennetaan tämän Configin ominaisuuksia oletusconfigeilla
  cjson.extend(this, Config.defaults);
}

/**
 * @namespace Sisältää NetMatch-palvelimen oletusasetukset. Näitä voi muuttaa antamalla
 * {@link Server}-konstruktorille parametrina objektin, jonka avaimet sopivat tämän muotoon.
 */
Config.defaults = {
  /**
   * GSS-palvelimen osoite
   * @type String
   * @default "http://tuhoojabotti.com/nm"
   */
  regHost: "http://tuhoojabotti.com/nm",
  /**
   * GSS-palvelimella oleva polku gss.php tiedostoon
   * @type String
   * @default "/reg/gss.php"
   */
  regPath: "/reg/gss.php",
  /**
   * Rekisteröidäänkö palvelin
   * @type Boolean
   * @default true
   */
  register: true,
  /**
   * Osoite, josta pelaaja voi ladata puuttuvan kartan
   * @type String
   * @default "http://netmatch.vesq.org/maps/"
   */
  mapDownloadUrl: "http://netmatch.vesq.org/maps/",
  /**
   * Palvelimen kuvaus, näkyy listauksessa
   * @type String
   * @default "Node.js powered server"
   */
  description: "Node.js powered server",
  /**
   * Pelattava kartta. Voi olla merkkijono, jolloin pelataan vain yhtä karttaa, tai taulukko,
   * joka sisältää useamman kartan ja niitä kierrätetään erien välillä. Kaikkien karttojen tulee
   * olla olemassa kun palvelin käynnistetään.
   * @type String|Array
   * @default ["Luna", "Warehouse", "Mictlan"]
   */
  map: ["Luna", "Warehouse", "Mictlan"],
  /**
   * Maksimimäärä pelaajia. Suurin mahdollinen maksimimäärä on 64.
   * @type Number
   * @default 10
   */
  maxPlayers: 10,
  /**
   * Bottien määrä. Jos tämä on nollaa pienempi, käytetään kartan asetuksissa määriteltyä arvoa.
   * @type Number
   * @default -1
   */
  botCount: -1,
  /**
   * Minkä pelaajamäärän jälkeen (pelaajat + botit) botteja lähtee itsestään pois. Jos tämä arvo on
   * pienempi kuin botCount-arvo, niin tämä asetetaan samaksi botCountin kanssa. Jos tämä on 0, niin
   * botit eivät poistu automaattisesti koskaan. Jos taas tämä on nollaa pienempi, käytetään kartan
   * asetuksissa määriteltyä arvoa.
   * @type Number
   * @default -1
   */
  botDepartLimit: -1,
  /**
   * Bottien käytössä olevat aseet. Jos tämä on tyhjä, käytetään kartan asetuksissa olevia aseita.
   * Jos niitäkään ei ole, on käytössä kaikki aseet.
   *  - 1 = Pistooli
   *  - 2 = Konepistooli
   *  - 3 = Sinko
   *  - 4 = Haulikko
   *  - 5 = Kranaatinlaukaisin
   *  - 6 = Moottorisaha
   * @type Array
   * @default []
   */
  botWeapons: [],
  /**
   * Pelimoodi: DM = 1, TDM = 2, Zombiemode = 3
   * @type Byte
   * @default 1
   */
  gameMode: 1,
  /**
   * Kuinka pitkään yksi kierros kestää. Aika sekunneissa. 0 tarkoittaa ettei erä pääty koskaan.
   * @type Number
   * @default 300
   */
  periodLength: 300,
  /**
   * Kuinka pitkän ajan pelaajilla on suoja spawnauksen jälkeen. Aika millisekunteissa
   * @type Number
   * @default 3000
   */
  spawnProtection: 3000,
  /**
   * Kuinka kauan kestää (millisekunteina) että pelaajat heräävät henkiin uudelleen
   * @type Number
   * @default 3000
   */
  deathDelay: 3000,
  /**
   * Kuinka pitkän ajan jälkeen (millisekunteina) pelaaja poistetaan pelistä, kun hänestä ei ole
   * kuulunut mitään
   * @type Number
   * @default 10000
   */
  maxInactiveTime: 10000,
  /**
   * Näytetäänkö palvelimen konsolissa tappoviestit
   * @type Boolean
   * @default false
   */
  logKillMessages: false,
  /**
   * Ovatko tutkanuolet käytössä vai ei
   * @type Boolean
   * @default true
   */
  radarArrows: true,
  /**
   * Palvelimen pelimoottorin päivitystahti, kuinka monta päivitystä per sekunti tehdään.
   * @type Number
   * @default 60
   */
  updatesPerSec: 60,
  /**
   * Palvelimen salasana. Jos tätä ei aseteta, pelaaja voi saada admin-oikeudet vain palvelimen
   * konsolikomennon op kautta.
   * @type String
   * @default ""
   */
  password: "",
  /**
   * Onko palvelin kehitysversio
   * @type Boolean
   * @default false
   */
  devBuild: false
};

/**
 * Lataa asetukset annetusta tiedostosta. Tämä metodi hakee tiedostoa node-NetMatchin juuresta.
 *
 * @param {String} [config="config"]  Asetustiedoston nimi, ilman .json päätettä.
 *
 * @returns {Boolean}  Pystytäänkö peliä jatkamaan nykyisillä asetuksilla
 */
Config.prototype.load = function (config) {
  if (config.substr(-5) !== '.json') {
    config += '.json';
  }
  var filePath = path.resolve(__dirname, '..', config)
    , loadedConfig
    , i, mapPath;

  if (!path.existsSync(filePath)) {
    log.error('Config %0 doesn\'t exist', filePath.green);
    log.error('Use `%0` to load your own config', 'npm set NetMatch:config /path/to/your/config.json'.yellow);
    return true;
  }

  log.info('Loading config from %0', filePath.green);
  loadedConfig = cjson.load(filePath);
  // Laajennetaan tämän Configin ominaisuuksia ladatulla json-tiedostolla
  cjson.extend(this, loadedConfig);

  // Tarkistetaan onko maksimimäärä liian suuri ja kaadetaan palvelin mikäli on
  if (this.maxPlayers > 64) {
    log.fatal('maxPlayers set to %0 while the hardcoded maximum is %1!', this.maxPlayers, 64);
    return false;
  }

  // Tarkistetaan onko kartta merkkijono. Jos se on merkkijono, niin muutetaan se listaksi jossa
  // on vain yksi arvo.
  if ('string' === typeof this.map) {
    this.map = [this.map];
  }

  // Tarkistetaan että kartta todellakin on lista tässä vaiheessa
  if (!Array.isArray(this.map)) {
    log.fatal('Invalid value for "map" in config %0', filePath.green);
    return false;
  }

  // Tarkistetaan onko määritellyt kartat olemassa
  for (i = 0; i < this.map.length; i++) {
    mapPath = path.resolve(__dirname, '..', 'maps', this.map[i] + '.json');

    if (!path.existsSync(mapPath)) {
      log.fatal('Map %0 doesn\'t exist in %1', this.map[i].green, mapPath.green);
      return false;
    }
  }

  if (this.mapDownloadUrl[this.mapDownloadUrl.length - 1] !== '/') {
    this.mapDownloadUrl = this.mapDownloadUrl + '/';
  }

  return true;
};

module.exports = Config;
