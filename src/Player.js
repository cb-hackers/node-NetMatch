/**
 * @fileOverview Sisältää {@link Player}-luokan toteutuksen.
 */

/**#nocode+*/
var log = require('./Utils').log
  , Obj = require('./Object');
/**#nocode-*/

/**
 * Luo uuden pelaajan.
 *
 * @class Kaikki pelaajat, niin ihmispelaajat kuin botitkin, ovat tämän luokan jäseniä.
 *
 * @param {Object} [attr]  Objekti joka sisältää joitakin valmiiksi asettuja arvoja uudelle pelaajalle.
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
 * @property {Integer} isDead        Onko pelaaja kuollut
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
function Player() {
  Obj.call(this, 0, 0, 0);
}
Player.prototype = new Obj();
Player.prototype.constructor = Player;

exports = module.exports = Player;
