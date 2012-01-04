Komentojen lisääminen
=====================

1. Luot tiedoston: `komento[.mitävaan].js` kansioon Commands.
2. Tiedoston sisään luot objektin, jonka viet moduulina: `module.exports = {};`.

**Objektin sisälle tarvitaan seuraavat ominaisuudet:**

   * `Object[] params`  Parametrit listassa. Jokaisella parametrilla on seuraavat kentät:
      - `String name` Parametrin nimi
      - `String type` Parametrin tyyppi (esim. `string` tai `player`) käytetään täydennyksessä
      - `Boolean optional` Voiko parametrin jättää antamatta
      - `String help` Parametrin ohje, mitä tämä parametri tekee
   * `String help`    Mihin komentoa käytetään
   * `Boolean remote`  Voiko komentoa kutsua klientillä
   * `Function action`  Komennon logiikka
   * `Array [sub]`   Lista alikomentojen nimistä esim. config get/set/save → `sub: ['get', 'set', 'save']` Tätä käytetään täydennyksessä.

action-funktiota kutsutaan sitten serverin toimesta ja se saa kontekstikseen (`this`) palvelimen, jonka ansiosta se voi vaikuttaa palvelimen toimintaan.
argumentit annetaan funktiolle suoraan ja niihin pääsii käsiksi JavaScriptin arguments-ominaisuudella. Ensimmäinen argumentti on aina komennon kutsuja, 
pelaaja instanssi tai undefined mikäli komentoa kutsuttiin palvelimelta.

**Protip: Katso mallia valmiista komennoista**