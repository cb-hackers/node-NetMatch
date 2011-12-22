var colors = require('colors')
  , Logger = require('cbNetwork').Logger;

/**
 * @namespace Sisältää hyödyllisiä funktioita.
 */
Utils = {
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
  timer: function() {
    return new Date().getTime();
  }
};

exports = module.exports = Utils;