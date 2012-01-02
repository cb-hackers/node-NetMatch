/**
 * @fileOverview Sisältää {@link Obj}-luokan toteutuksen.
 */

/**#nocode+*/
var wrapAngle = require('./Utils').wrapAngle;
/**#nocode-*/

/**
 * Luo uuden objektin.
 * @class Objekti
 *
 * @param {Number} x      X-koordinaatti
 * @param {Number} y      Y-koordinaatti
 * @param {Number} angle  Kulma
 *
 * @property {Number} x      X-koordinaatti
 * @property {Number} y      Y-koordinaatti
 * @property {Number} angle  Kulma
 */
function Obj(x, y, angle) {
  this.x = x;
  this.y = y;
  this.angle = angle;
}

/**
 * Siirtää objektia, ottaen huomioon nykyisen kulman.
 * @param {Number} px        Kuinka monta pikseliä objektia siirretään pituussuunnassa
 * @param {Number} [sidePx]  Kuinka monta pikseliä objektia siirretään leveyssuunnassa
 */
Obj.prototype.move = function (px, sidePx) {
  this.x += Math.cos((this.angle / 180) * Math.PI) * px;
  this.y += Math.sin((this.angle / 180) * Math.PI) * px;
  if ('number' === typeof sidePx) {
    this.x += Math.cos((this.angle - 90) / 180 * Math.PI) * sidePx;
    this.y += Math.sin((this.angle - 90) / 180 * Math.PI) * sidePx;
  }
}

/**
 * Kääntää objektia, pitäen kulman kuitenkin välillä 0-360
 * @param {Number} angle  Kuinka monta astetta objektia käännetään
 */
Obj.prototype.turn = function (angle) {
  this.angle = wrapAngle(this.angle + angle);
}

exports = module.exports = Obj;
