/**
 * @fileOverview Sisältää hyödyllisiä funktioita, eli {@link Utils}-nimiavaruuden toteutuksen.
 */
var argv = require('optimist')
  .default({d: false}).alias({'d' : 'debug'}).argv
  , colors = require('colors')
  , Logger = require('cbNetwork').Logger;

/**
 * @namespace Sisältää hyödyllisiä funktioita.
 */
var Utils = {
  /**
   * Yleinen funktio lokiin/konsoliin (stdout) kirjoittamista varteen. Tämä on instanssi cbNetwork-noden
   * <a href="http://vesq.github.com/cbNetwork-node/doc/symbols/Logger.html">Logger</a>-luokasta.
   * Voit käyttää tätä näin:
   * @example
   * var log = Utils.log;
   *
   * log.write('Perusviesti, tämä on ilman värejä.');
   * log.info('Jotain tiedotettavaa tapahtui. Tulostuu vihreänä.');
   * log.warn('Varoitus! Tulostuu keltaisena.');
   * log.notice('Ilmoitus! Tulostuu keltaisena.');
   * log.error('VIRHE! Tulostuu punaisena ja lihavoituna.');
   * log.fatal('KRIITTINEN VIRHE! Tulostuu punaisena ja lihavoituna.');
   */
  log: new Logger('[NetMatch %t] '.grey, argv.d),

  /**
   * Palauttaa satunnaisen luvun väliltä minVal...maxVal, mahdollisesti liukulukuna
   * @param {Number} minVal       Pienin mahdollinen luku
   * @param {Number} maxVal       Suurin mahdollinen luku
   * @param {Boolean} [floatVal]  Palautetaanko liukulukuna. Jos tätä ei anneta, palautetaan
   *                              kokonaislukuna.
   */
  rand: function (minVal, maxVal, floatVal) {
    var randVal = minVal + (Math.random() * (maxVal - minVal));
    return typeof floatVal === 'undefined' ? Math.round(randVal) : randVal;
  },

  /**
   * Pitää kulman välillä 0-360
   * @param {Number} angle  Kulma
   * @returns {Number}
   */
  wrapAngle: function (a) {
    a = a / 360;
    return (a - Math.floor(a)) * 360;
  },

  /**
   * Palauttaa kahden pisteen välisen etäisyyden
   * @param {Number} x1  Ensimmäisen pisteen x-koordinaatti
   * @param {Number} y1  Ensimmäisen pisteen y-koordinaatti
   * @param {Number} x2  Toisen pisteen x-koordinaatti
   * @param {Number} y2  Toisen pisteen y-koordinaatti
   * @returns {Number}   Pisteiden välinen etäisyys
   */
  distance: function (x1, y1, x2, y2) {
    var dx = x1 - x2; // Vaakasuuntainen etäisyys
    var dy = y1 - y2; // Pystysuuntainen etäisyys
    return Math.sqrt( dx*dx + dy*dy );
  },

  /**
   * Palauttaa taulukon, jossa on merkkijono paloiteltuna sanoiksi, ottaa huomioon "merkki jonot"
   * @param {String} str  Merkkijono, joka paloitellaan
   * @returns {Array}  Paloiteltu jono
   */
  splitString: function (str) {
    var reg = /\ (?!\w+")/;
    return str.split(reg);
  },

  /**
   * Kuten Array.prototype.join, mutta tukee viimeisen erottimen vaihtoa.
   * @param {Array}  arr     Lista, joka yhdistetään
   * @param {String} delim   Ensimmäinen erotin, jota käytetään muihin kuin viimeiseen väliin
   * @param {String} delim2  Erotin, joka laitetaan viimeiseen väliin
   * @returns {String}  Yhdistetty jono
   */
  join: function (arr, delim, delim2) {
    return arr.length > 1 ? arr.slice(0, arr.length - 1).join(delim) +
      ' ' + delim2 + arr[arr.length - 1] : arr[0];
  }

};

module.exports = Utils;
