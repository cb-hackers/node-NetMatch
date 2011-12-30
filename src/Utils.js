/**
 * @fileOverview Sisältää hyödyllisiä funktioita, eli {@link Utils}-nimiavaruuden toteutuksen.
 */
var colors = require('colors')
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
  log: new Logger('[NetMatch %t] '.grey),

  /**
   * Palauttaa nykyisen palvelimen ajan millisekunteina, toimii kuten CoolBasicin Timer().
   */
  timer: function () {
    return new Date().getTime();
  },

  /**
   * Palauttaa satunnaisen luvun väliltä minVal...maxVal tarkkuudella floatVal
   * @param {Number} minVal      Pienin mahdollinen luku
   * @param {Number} maxVal      Suurin mahdollinen luku
   * @param {Number} [floatVal]  Palautettavan satunnaisen luvun tarkkuus. Mikäli tätä ei anneta,
   *                             palautetaan kokonaisluku.
   */
  rand: function (minVal, maxVal, floatVal) {
    var randVal = minVal + (Math.random() * (maxVal - minVal));
    return typeof floatVal === 'undefined' ? Math.round(randVal) : randVal.toFixed(floatVal);
  }
};

exports = module.exports = Utils;
