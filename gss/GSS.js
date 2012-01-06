var static = require('node-static')
  , hogan = require('hogan.js')
  , fs   = require('fs')
  , udp  = require('dgram')
  , http = require('http')
  , join = require('../src/Utils').join
  , url  = require('url')
  , argv = require('optimist')
    .default({d: false, a: '0.0.0.0', p: 31479})
    .alias({'p' : 'port', 'a' : 'address', 'd' : 'debug', 'h': 'help'})
    .describe({
      'h': 'Shows this help and exits.',
      'p': 'Port to listen to.',
      'a': 'Address to bind to defaults to all addresses.',
      'd': 'Spam a lot.'})
    .usage('Run Game Server Service (GSS) -server: $0')
    .demand('p')
    .check(function (a) {return !a.h;}) // Näytetään helppi, jos -h tai --help
    .argv; // Palautetaan parametrit opjektina, jotta niitä

var NM_PROFILE = 'NetMatch';

function GSS(p, a) {
  var self = this;
  self.listingTempl = hogan.compile(fs.readFileSync('listing.html', 'utf8'));
  self.servers = [];
  self.sock = udp.createSocket('udp4');
  var file = new (static.Server)();
  self.htp = http.createServer().listen(p, a);
  self.htp.on('request', function (req, res) {
    var uri = url.parse(req.url, true)
      , mode = uri.query.mode
      , location = uri.path.split('/');

    // Pyyntö on rekisteröinti-apille
    if (location[1] === 'reg') {
      // Palautetaan aina selkokieltä
      res.writeHead(200, {'Content-Type': 'text/plain'});

      // Mitä tehdään?
      if (mode && ['reg', 'list', 'unreg', 'update'].indexOf(mode) !== -1) {
        self.emit(mode, req, res, uri);
      } else {
        res.end('unknown_mode');
      }
    } else if (location[1] === 'assets') {
      // Tarjotaan staattisia varoja
      file.serve(req, res);
    } else {
      self.listingTempl = hogan.compile(fs.readFileSync('listing.html', 'utf8'));
      res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
      res.end(self.listingTempl.render({
        servers: self.servers.filter(function (s) { return s.active; })
      }));
    }
  });
}
// Laajennetaan EventEmitteriä, saadaan emit.
GSS.prototype.__proto__ = process.EventEmitter.prototype;

GSS.prototype.getServer = function (sid) {
  for (var i = this.servers.length; i--;) {
    var s = this.servers[i];
    if (s.ip + ':' + s.port === sid) {
      return s;
    }
  }
};

var gss = new GSS(argv.p, argv.a);

/**************************|*******************.
| SERVUN REKISTERÖINTI :O) |                    \
|--------------------------´                     \
| Palautettava merkkijono on jokin seuraavista:   \
|   registering_failed = jokin tiedoista väärin   |
|   system_error       = socket feilasi           |
|   server_exists      = samalla IP:llä ja        /
|                        portilla on jo palvelin /
|   ok                 = kaikki onnistui        /
`**********************************************/
gss.on('reg', function (req, res, uri) {
  var self = this
    , q = uri.query
    , ip   = q.addr || req.headers['x-forwarded-for']
    , port = parseInt(q.port, 10)
    , sid  = ip + ':' + port
    , serv = gss.getServer(sid)
    , devb = !!q.devbuild;

  // Jokin tiedoista puuttuu
  if (!q.profile || !q.ver || !q.desc || !port) {
    res.end('registering_failed');
    return;
  }

  // Jokin tiedoista näyttää alustavasti väärältä
  if (q.profile !== NM_PROFILE || !q.desc.length || port < 1 || port > 65535) {
    res.end('registering_failed');
    return;
  }

  // Katsotaan löytyyko palvelin jo samasta osoitteesta ja portista
  if (serv && Date.now() - serv.last < 90000) {
    res.end('server_exists');
    return;
  } else if (serv) {
    self.servers.splice(self.servers.indexOf(serv), 1);
  }

  // Tarkistetaan serverin toimivuus UDP-paketilla.
  //                       [ ,->  544437095  <-.  |  ,->    GSS+    <--.  ]
  gss.sock.send(new Buffer([0x67, 0x73, 0x73, 0x20, 0x47, 0x53, 0x53, 0x2B]), 0, 8, port, ip,
  function sockSend(err, bytes) {
    if (err) {
      res.end('system_error');
      return;
    }
    // Tallennetaan serveri listaan, jos kaikki meni kuten piti
    self.servers.push({
      active: false,
      ip: ip,
      port: port,
      ver: q.ver,
      desc: q.desc,
      dev: devb,
      last: undefined
    });
  });

  res.end('ok')
});

/**************************|*******************.
| SERVUN PÄIVITTÄMINEN :O) |                    \
|--------------------------´                     \
| Palautettava merkkijono on jokin seuraavista:   |
|   update_failed      = tiedot väärin            |
|   system_error       = MySQL feilasi           /
|   ok                 = kaikki onnistui        /
`**********************************************/
gss.on('update', function (req, res, uri) {
  var self = this, info
  , q = uri.query
  , ip   = q.addr || req.headers['x-forwarded-for']
  , port = parseInt(q.port, 10)
  , sid  = ip + ':' + port
  , serv = gss.getServer(sid)
  , devb = !!q.devbuild;

  // Jokin tiedoista puuttuu
  if (!q.profile || !q.port || !q.data) {
    console.log('insufficient parameters.');
    res.end('update_failed');
    return;
  }
  // Jokin tiedoista näyttää alustavasti väärältä
  if (q.profile !== NM_PROFILE || !q.data.length || port < 1 || port > 65535) {
    res.end('update_failed');
    return;
  }
  // Onko servu rekisteröity?
  if (!serv) {
    res.end('update_failed');
    return;
  }

  info = q.data.split(',');
  // Update data
  serv.info = {
    players: parseInt(info[0], 10),
    bots: parseInt(info[1], 10),
    map: info[2].replace(/_/g, ' '),
    maxPlayers: parseInt(info[3], 10),
    names: info[4] ? '<em>' + join(info[4].split('|'), '</em>, <em>', '</em>and <em>') + '</em>' : ''
  };
  serv.active = true;
  serv.last = Date.now();
  res.end('ok');
});

/*********************************|************.
| SERVUN POISTAMINEN LISTALTA :O) |             \
|---------------------------------´              \
| Palautettava merkkijono on jokin seuraavista:   |
|   unregistering_failed = tiedot väärin         /
|   ok                   = kaikki onnistui      /
`**********************************************/
gss.on('unreg', function (req, res, uri) {
  var self = this, info
  , q = uri.query
  , ip   = q.addr || req.headers['x-forwarded-for']
  , port = parseInt(q.port, 10)
  , sid  = ip + ':' + port
  , serv = gss.getServer(sid)
  , devb = !!q.devbuild;

  // Jokin tiedoista puuttuu
  if (!q.profile || !q.port) {
    console.log('insufficient parameters.');
    res.end('unregistering_failed');
    return;
  }
  // Jokin tiedoista näyttää alustavasti väärältä
  if (q.profile !== NM_PROFILE || port < 1 || port > 65535) {
    res.end('unregistering_failed');
    return;
  }
  // Onko servu rekisteröity?
  if (!serv) {
    res.end('unregistering_failed');
    return;
  }

  self.servers.splice(self.servers.indexOf(serv), 1);
  res.end('ok');
});

gss.on('list', function (req, res, uri) {
  res.end('GSS:');
});


function each(obj, fn) { Object.keys(obj).forEach(function (n) { fn(obj[n]); }); }