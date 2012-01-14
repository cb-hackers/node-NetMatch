/**
 * @fileOverview Sisältää {@link Weapons} nimiavaruuden.
 */

/**#nocode+*/
var WPN = require('./Constants').WPN;
/**#nocode-*/

/**
 * @name Weapons.WPN
 * @namespace Sisältää aseet ja niiden ominaisuudet. Jokaisella aseella on alla olevat kentät:
 * <table>
 * <tr><td> reloadTime   </td><td>  Latausaika  </td></tr>
 * <tr><td> bulletSpeed  </td><td>  Paljonko ammus liikkuu yhdessä sekunnissa  </td></tr>
 * <tr><td> bulletForth  </td><td>  Ammuksen lähtöpaikka pelaajan etupuolella  </td></tr>
 * <tr><td> bulletYaw    </td><td>  Ammuksen lähtöpaikka sivusuunnassa  </td></tr>
 * <tr><td> damage       </td><td>  Ammuksen aiheuttama tuho  </td></tr>
 * <tr><td> damageRange  </td><td>  Tuhoalueen laajuus  </td></tr>
 * <tr><td> spread       </td><td>  Hajonta asteina  </td></tr>
 * <tr><td> maxAmmo      </td><td>  Ammusten maksimimäärä  </td></tr>
 * <tr><td> pickCount    </td><td>  Kuinka paljon tavaraa saa poimittaessa  </td></tr>
 * <tr><td> safeRange    </td><td>  Etäisyys jonka alle kohteesta oleva botti ei ammu  </td></tr>
 * <tr><td> shootRange   </td><td>  Etäisyys jonka alle kohteesta oleva botti ampuu  </td></tr>
 * <tr><td> weight       </td><td>  Aseen paino, vaikuttaa liikkumisen nopeuteen. 100 = normaali  </td></tr>
 * <tr><td> name         </td><td>  Aseen nimi merkkijonona, debuggailua varten  </td></tr>
 * </table>
 */
var Weapons = {};

/**
 * Pistooli, <code>Weapons[WPN.PISTOL]</code>
 * @name Weapons.WPN.PISTOL
 */
Weapons[WPN.PISTOL] = {
  reloadTime: 250,
  bulletSpeed: 1200,
  bulletForth: 33,
  bulletYaw: 10,
  damage: 19,
  damageRange: 0,
  spread: 0,
  maxAmmo: 0,
  pickCount: undefined,
  safeRange: 100,
  shootRange: 500,
  weight: 100,
  name: "pistol"
};

/**
 * Konekivääri, <code>Weapons[WPN.MGUN]</code>
 * @name Weapons.WPN.MGUN
 */
Weapons[WPN.MGUN] = {
  reloadTime: 100,
  bulletSpeed: 1000,
  bulletForth: 29,
  bulletYaw: 8,
  damage: 17,
  damageRange: 0,
  spread: 2,
  maxAmmo: 150,
  pickCount: 50,
  safeRange: 200,
  shootRange: 500,
  weight: 100,
  name: "machinegun"
};

/**
 * Sinko, <code>Weapons[WPN.BAZOOKA]</code>
 * @name Weapons.WPN.BAZOOKA
 */
Weapons[WPN.BAZOOKA] = {
  reloadTime: 1500,
  bulletSpeed: 900,
  bulletForth: 30,
  bulletYaw: 8,
  damage: 150,
  damageRange: 250,
  spread: 0,
  maxAmmo: 10,
  pickCount: 5,
  safeRange: 300,
  shootRange: 500,
  weight: 115,
  name: "bazooka"
};

/**
 * Haulikko, <code>Weapons[WPN.SHOTGUN]</code>
 * @name Weapons.WPN.SHOTGUN
 */
Weapons[WPN.SHOTGUN] = {
  reloadTime: 1000,
  bulletSpeed: 900,
  bulletForth: 33,
  bulletYaw: 10,
  damage: 20,
  damageRange: 0,
  spread: 15,
  maxAmmo: 20,
  pickCount: 10,
  safeRange: 150,
  shootRange: 300,
  weight: 100,
  name: "shotgun"
};

/**
 * Kranaatinlaukaisin, <code>Weapons[WPN.LAUNCHER]</code>
 * @name Weapons.WPN.LAUNCHER
 */
Weapons[WPN.LAUNCHER] = {
  reloadTime: 1000,
  bulletSpeed: 400,
  bulletForth: 32,
  bulletYaw: 8,
  damage: 200,
  damageRange: 150,
  spread: 5,
  maxAmmo: 6,
  pickCount: 2,
  safeRange: 300,
  shootRange: 400,
  weight: 110,
  name: "launcher"
};

/**
 * Moottorisaha, <code>Weapons[WPN.CHAINSAW]</code>
 * @name Weapons.WPN.CHAINSAW
 */
Weapons[WPN.CHAINSAW] = {
  reloadTime: 100,
  bulletSpeed: 0,
  bulletForth: 45,
  bulletYaw: 9,
  damage: 70,
  damageRange: 60,
  spread: 0,
  maxAmmo: 100,
  pickCount: 50,
  safeRange: 60,
  shootRange: 150,
  weight: 90,
  name: "chainsaw"
};

module.exports = Weapons;
