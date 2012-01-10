
  // Oma loggeri ja join-funktio
var Logger = require('./Logger').Logger
  , join   = require('../src/Utils').join
  // Pari Noden ydinmoduulia
  , util = require('util')
  , http = require('http')
  , udp  = require('dgram')
  , url  = require('url')
  , dns  = require('dns')
  , fs   = require('fs')
  // Sekä pari herkkua NPM:stä :)
  , async = require('async')
  , hogan = require('hogan.js')
  , assets = require('paperboy')
  // Substack rulz<3
  , argv = require('optimist')
    .default({d: false, a: '0.0.0.0', p: 31479, ua: 'lakka.kapsi.fi', up: 61902})
    .alias({'h': 'help', 'p' : 'port', 'a' : 'address', 'up': 'udpport', 'ua': 'udpaddress'})
    .describe({
      'h':  'Shows this help and exits.',
      'p':  'Port to listen to.',
      'a':  'Address to bind to defaults to all addresses.',
      'up': 'UDP port for listening to PING packets.',
      'ua': 'UDP address for listening to PING packets.'})
    .usage('Run Game Server Service (GSS) -server: $0')
    .demand('p')
    .check(function (a) {return !a.h;}).argv; // Näytetään helppi, jos -h tai --help

// tätä profiilia vaaditaan.
var NM_PROFILE = 'NetMatch';

function GSS(p, a, up, ua) {
  var self = this;

  // Yleinen logitus
  self.log = new Logger('gss');

  // Valmistele sapluuna, jolla serverilistaus näytetään html-muodossa.
  self.listingTempl = hogan.compile(fs.readFileSync('listing.html', 'utf8'));

  // Lista palvelimista
  self.servers = [];

  // Luo UDP-socketti, jota käytetään kommunikointiin palvelimien kanssa.
  self.sock = udp.createSocket('udp4');
  // Kuuntele pong-paketteja
  self.sock.bind(up, ua);
  self.pingPacket = new Buffer([0x67, 0x73, 0x73, 0x20, 0x50, 0x49, 0x4e, 0x47]);
  self.sock.on('message', function onUDP(data, peer) {
    if (String(data.slice(data.length - 4)) === 'PONG') {
      self.servers.forEach(function serverLoop(srv) {
        if (srv.ip === peer.address && srv.port === peer.port) {
          srv.ping = Date.now() - srv.pingT;
        }
      });
    }
  });

  // Luodaan http-palvelin, ja kuunnellaan.
  self.htp = http.createServer().listen(p, a);

  // Käsitellään pyynnöt.
  self.htp.on('request', function onHTTP(req, res) {
    var uri = url.parse(req.url, true)
      , mode = uri.query.mode
      , location = uri.path.split('/');

    if (location[1] === 'reg') {
      // Pyydettiin jotain rekisteröintiin liittyvää.
      res.writeHead(200, {'Content-Type': 'text/plain'});
      // Mitä tehdään?
      if (mode && ['reg', 'list', 'unreg', 'update'].indexOf(mode) !== -1) {
        self.emit(mode, req, res, uri);
      } else {
        res.end('unknown_mode');
      }
    } else if (location[1] === 'assets') {
      // Pyydettiin jotain assets-kansiosta.
      assets.deliver(__dirname, req, res);
    } else if (location[1] === 'log') {
      // Pyydettiin lokia.
      self.emit('log', req, res, location);
    } else {
      // Muissa tapauksissa annetaan vain html-listaus servuista.
      self.emit('html', req, res);
    }
  });
}

// Laajennetaan EventEmitteriä, saadaan emit.
util.inherits(GSS, process.EventEmitter);

GSS.prototype.getServer = function (sid, cb) {
  for (var i = this.servers.length; i--;) {
    if (this.servers[i].sid === sid) { return this.servers[i]; }
  };
};

GSS.prototype.getUpdatePing = function (srv) {
  if (srv && parseFloat(srv.ver.slice(1)) >= 2.5) {
    srv.pingT = Date.now();
    this.sock.send(this.pingPacket, 0, 8, srv.port, srv.addr);
  }
};

GSS.prototype.endRequest = function (res, log, msg) {
  res.end(msg); // Vastataan http-pyyntöön
  log.end(msg, msg === 'ok'); // Kirjoitetaan vastaus myös lokiin
};

var gss = new GSS(argv.p, argv.a);

/***************\
| HTML LOKI :O) |
\************ **/
gss.on('log', function onHTMLLog(req, res, location) {
  var self = this
    , currFile = location[2] || 'gss.log'

  // Debug
  self.logTempl = hogan.compile(fs.readFileSync('log.html', 'utf8'));

  // Hoidetaan IO asynkronisesti!
  async.parallel(
  { log: function readLog(cb) {
      fs.readFile('./logs/' + currFile, 'utf8', cb); }
  , files: function listLogs(cb) {
      fs.readdir('./logs', cb); }
  }, // Valmista
  function fileIODone(err, results) {
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
    if (err) { res.end('error'); return; }
    var logs = results.log.split('\n')
      , json = '[' + logs.slice(0, logs.length - 1) + ']'
      , lobj = JSON.parse(json)
      , files = results.files.map(function (f) {
          if (f === currFile) { return '<a class="this" href="./log/' + f + '">' + f + '</a>'; }
          else                { return '<a              href="./log/' + f + '">' + f + '</a>'; }
        });
    // Tarjoillaan hienosti muotoiltu loki.
    res.end(self.logTempl.render({files: files, logs: lobj, currentFile: currFile}));
  });
});

/******************\
| HTML LISTAUS :O) |
\******************/
gss.on('html', function onHTMLList(req, res) {
  var self = this;

  // Päivitetään pingit
  self.servers.forEach(function (s) {
    self.getUpdatePing(s);
  });

  // Debug käytössä ladataan template aina uusiksi
  //self.listingTempl = hogan.compile(fs.readFileSync('listing.html', 'utf8'));

  res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
  res.end(self.listingTempl.render({
    // Listataan ainoastaan aktiiviset palvelimet
    servers: self.servers.filter(function (s) { return s.active; })
  }));
});

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
gss.on('reg', function onRegister(req, res, uri) {
  var self = this
    , q = uri.query
    , addr   = q.addr || req.headers['x-forwarded-for']
    , port = parseInt(q.port, 10)
    , sid = addr + ':' + port
    , serv = self.getServer(sid)
    , log = new Logger(sid);

  log.gss('register', req.headers, q);

  // Jokin tiedoista puuttuu
  if (!q.profile || !q.ver || !q.desc || !port) {
    log.add('Missing obligatory information from parameters.');
    self.endRequest(res, log, 'registering_failed');
    return;
  }

  // Jokin tiedoista näyttää alustavasti väärältä
  if (q.profile !== NM_PROFILE || !q.desc.length || port < 1 || port > 65535) {
    log.add('Incorrect parameters.');
    self.endRequest(res, log, 'registering_failed');
    return;
  }

  // Katsotaan löytyyko palvelin jo samasta osoitteesta ja portista
  if (serv && Date.now() - serv.last < 90000) {
    self.endRequest(res, log, 'server_exists');
    return;
  }
  // Poistetaan serveri, jos sellainen on.
  if (serv) { self.servers.splice(self.servers.indexOf(serv), 1); }

  // Tarkistetaan serverin toimivuus UDP-paketilla.
  //                       [ ,->  544437095  <-.  |  ,->    GSS+    <--.  ]
  self.sock.send(new Buffer([0x67, 0x73, 0x73, 0x20, 0x47, 0x53, 0x53, 0x2B]), 0, 8, port, addr,
  function sockSend(err, bytes) {
    if (err) {
      log.add('Socket error.');
      log.add(err);
      self.endRequest(res, log, 'system_error');
      return;
    }

    serv = {
      active: false,
      sid: sid,
      addr: addr,
      port: port,
      ver: q.ver,
      desc: q.desc,
      dev: !!q.devbuild,
      ip: addr,
      log: log,
      last: undefined
    };

    // Tallennetaan serveri listaan, jos kaikki meni kuten piti
    self.servers.push(serv);

    // Muunnetaan osoite ip:ksi, jotta sitä voidaan verrata saapuviin UDP-paketteihin.
    dns.resolve(addr, function (err, ip) {
      if (!err) { serv.ip = ip[0]; }
    });
  });

  self.endRequest(res, log, 'ok');
});

/**************************|*******************.
| SERVUN PÄIVITTÄMINEN :O) |                    \
|--------------------------´                     \
| Palautettava merkkijono on jokin seuraavista:   |
|   update_failed      = tiedot väärin            |
|   system_error       = MySQL feilasi           /
|   ok                 = kaikki onnistui        /
`**********************************************/
gss.on('update', function onUpdate(req, res, uri) {
  var self = this, info, log
  , q = uri.query
  , addr   = q.addr || req.headers['x-forwarded-for']
  , port = parseInt(q.port, 10)
  , sid = addr + ':' + port
  , serv = self.getServer(sid)

  // Onko servu rekisteröity?
  if (!serv) {
    // Luodaan uusi loki.
    log = new Logger(sid, 'a');
    log.gss('update', req.headers, q);
    log.add('Server does not exist.');
    self.endRequest(res, log, 'update_failed');
    return;
  }

  serv.log.gss('update', req.headers, q);

  // Jokin tiedoista puuttuu
  if (!q.profile || !q.port || !q.data) {
    serv.log.add('Insufficient parameters.');
    self.endRequest(res, serv.log, 'update_failed');
    return;
  }
  // Jokin tiedoista näyttää alustavasti väärältä
  if (q.profile !== NM_PROFILE || !q.data.length || port < 1 || port > 65535) {
    serv.log.add('Incorrect parameters.');
    self.endRequest(res, serv.log, 'update_failed');
    return;
  }

  // Päivitetään pingi, jos servu on tarpeeksi uusi
  self.getUpdatePing(serv);

  info = q.data.split(',');
  // Update data
  serv.infoString = q.data;
  serv.info = {
    players: parseInt(info[0], 10),
    bots: parseInt(info[1], 10),
    map: info[2].replace(/_/g, ' '),
    maxPlayers: parseInt(info[3], 10),
    names: info[4] ? '<em>' + join(info[4].split('|'), '</em>, <em>', '</em>and <em>') + '</em>' : ''
  };

  serv.active = true;
  serv.last = Date.now();
  self.endRequest(res, serv.log, 'ok');
});

/*********************************|************.
| SERVUN POISTAMINEN LISTALTA :O) |             \
|---------------------------------´              \
| Palautettava merkkijono on jokin seuraavista:   |
|   unregistering_failed = tiedot väärin         /
|   ok                   = kaikki onnistui      /
`**********************************************/
gss.on('unreg', function onUnregister(req, res, uri) {
  var self = this, info
  , q = uri.query
  , addr   = q.addr || req.headers['x-forwarded-for']
  , port = parseInt(q.port, 10)
  , sid = addr + ':' + port
  , serv = self.getServer(sid)

  // Onko servu rekisteröity?
  if (!serv) {
    log = new Logger(sid, 'a');
    log.gss('unregister', req.headers, q);
    log.add('server does not exist');
    self.endRequest(res, log, 'unregistering_failed');
    return;
  }

  serv.log.gss('unregister', req.headers, q);

  self.getServer(addr + ':' + port, function (s) { serv = s; });

  // Jokin tiedoista puuttuu
  if (!q.profile || !q.port) {
    serv.log.add('insufficient parameters');
    self.endRequest(res, serv.log, 'unregistering_failed');
    return;
  }
  // Jokin tiedoista näyttää alustavasti väärältä
  if (q.profile !== NM_PROFILE || port < 1 || port > 65535) {
    serv.log.add('incorrect parameters');
    self.endRequest(res, serv.log, 'unregistering_failed');
    return;
  }

  self.servers.splice(self.servers.indexOf(serv), 1);
  self.endRequest(res, serv.log, 'ok');
});

gss.on('list', function (req, res, uri) {
  var self = this, serv
  , q = uri.query
  , debug = !!q.debug
  , dev = !!q.devbuild
  , list = 'GSS:';

  // Jos osoitteessa on debug-parametri, niin ei tarkisteta muita.
  if (!debug) {
    if (q.profile !== NM_PROFILE || !q.ver) {
      self.log.gss('list', req.headers, q);
      self.log.add('incorrect parameters');
      self.endRequest(res, self.log, 'listing_failed');
    }
  }

  // Luupataan palvelimet
  self.servers.forEach(function (serv, i) {

    // Onko palvelin aktiivinen?
    if (Date.now() - serv.last > 90000) { serv.active = false; }
    // Jos ei niin poistetaan listauksesta.
    if (!serv.active) {
      serv.log.info('timeout', 'Deleted server after inactivity.');
      serv.log.end('deleted');
      self.servers.splice(i, 1);
      return;
    }

    // Tulostetaan, jos versiot täsmää, klientti on dev tai debug-tila on päällä.
    if ((serv.ver === q.ver && !serv.dev) || dev || debug) {
      list += 'name=' + serv.desc + '|'
           +  'addr=' + serv.addr + '|'
           +  'port=' + serv.port + '|'
           +  'info=' + serv.infoString + '|'
           +  'ver='  + serv.ver + (serv.dev && debug ? '-dev' : '') + '\n';
    }

  });

  res.end(list);
});

/** Käsitellään ei napatut virheet, jotta palvelin ei kaatuisi. */
process.on('uncaughtException', function (e) {
  // Varmuuden vuoksi tulostetaan konsoliin, jos loggeri kaatuu. :E
  console.log(e.stack);
  gss.log.error('uncaughtException', e);
  gss.log.end('fix!', false);
});

function each(obj, fn) { Object.keys(obj).forEach(function (n) { fn(obj[n]); }); }