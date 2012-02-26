var util = require('util')
  , fs = require('fs');

/** Logger */
function Logger(sid, flag) {
  // Login id (server id = address:port)
  this.sid = sid;
  // Striimi johon kirjoitetaan
  this.out = fs.createWriteStream(
    __dirname + '/logs/' + sid.replace(/:/g, '-') + '.log', {flags: flag || 'w'});
  // Tähän kasataan viesti, joka kirjoitetaan sitten flush-funktiolla.
  this.buf = {};
  // Viimeisin viesti
  this.last = {};
}

// Luo uuden gss-loki-objektin
Logger.prototype.gss = function (type, req, params) {
  // Luodaan viesti
  this.buf = {
    name: type,
    time: Date.now(),
    date: new Date().toLocaleString(),
    from: this.sid,
    details: [
      {name: 'Request', msg: JSON.stringify(req, null, '  ')},
      {name: 'Parameters', msg: JSON.stringify(params, null, '  ')}
    ]
  };
  // Update ja samat parametrit niin ei kirjoiteta lokiin turhaa spämmiä.
  if (this.buf.name === 'update' && this.last.name === 'update' &&
      this.buf.details[0].msg === this.last.details[0].msg &&
      this.buf.details[1].msg === this.last.details[1].msg) {
    this.buf = undefined;
  }
}

Logger.prototype.error = function (name, e) {
  this.buf = {
    name: name,
    time: Date.now(),
    date: new Date().toUTCString(),
    from: 'process',
    details: [
      {'name': 'Stack', msg: e.stack}
    ]
  };
};

Logger.prototype.info = function (name, message) {
  this.buf = {
    name: name,
    time: Date.now(),
    date: new Date().toUTCString(),
    from: this.sid,
    details: [
      {'name': 'Message', msg: message}
    ]
  };
}

/** Lisätään lisätietoja */
Logger.prototype.add = function (msg) {
  if (!this.buf.details) { this.buf.details = []; }
  if (msg instanceof Error) {
    // Lisätään virheen kasa
    this.buf.details.push({
      name: 'Stack',
      msg: msg.stack
    });
  } else {
    // Lisätään viesti
    this.buf.details.push({
      name: 'Details',
      msg: msg
    });
  }
};

Logger.prototype.end = function (msg, status) {
  // Ei lopetella tyhjiä viestejä.
  if (!this.buf) { return; }
  if (status) {
    this.buf.end = '<span class="sucs">' + msg + '</span>';
    this.success = true;
  } else {
    this.buf.end = '<span class="fail">' + msg + '</span>';
    this.success = false;
  }
  // Kirjoitetaan loki.
  this.flush();
};

/** Kirjoitetaan loki striimiin */
Logger.prototype.flush = function () {
  // Ei kirjoiteta, jos tyhjä.
  if (!this.buf) { return; }
  this.out.write(JSON.stringify(this.buf) + '\n');
  this.last = this.buf;
  this.buf = {};
};

exports.Logger = Logger;
