(function($) {

  window._comm = {
    counter: 0,
    requests: {},
    connected: false,
    buffer: [],
    timer: null,
    reload: null,
    hbidSent: 0,
    hbidReceived: 0
  };

  var connect = function() {

    var socket = new WebSocket((location.protocol === 'https:'
      ? 'wss' : 'ws') + '://' + location.host + '/ws');

    window._comm.req = function(req) {
      req.id = 'req' + ++window._comm.counter;
      var rec = { req: req };
      window._comm.requests[rec.req.id] = rec;
      send(JSON.stringify(req));
      return new Promise(function(resolve, reject) {
        rec.promise = {
          resolve: resolve,
          reject: reject
        }
      });
    };

    window._comm.heartbeat = function() {
      if(!window._comm.connected ||
        window._comm.hbidSent != window._comm.hbidReceived)
        return window._comm.reload()
      window._comm
        .req({ fn: 'heartbeat', hbid: window._comm.hbidSent++ })
        .then(function(rcv) {
          window._comm.hbidReceived = rcv;
      });
    };

    var send = function(json) {
      if(!window._comm.connected)
        window._comm.buffer.push(json);
      else
        socket.send(json);
    };

    function advance() {
      $('#gd-authy').remove();
      $('body').append('<script type="text/javascript" src="bundle.js"></script>');
    }

    function authyInit() {
      window._comm.req({ fn: 'authy-login-code' }).then(function(authyCode) {
        if(authyCode === 0)
          return advance(); // authy login disabled

        if(authyCode === -1) {
          // device is not fully initialized yet
          $('#gd-authy-code').text('Please wait, the device is initializing...');
          setTimeout(function() { authyInit(); }, 1000);
        }
        else {
          $('#gd-authy-code').text(authyCode);
          window._comm.req({ fn: 'authy-login-confirm' }).then(function(approved) {
            if(approved)
              advance();
          });
        }
      });
    };

    socket.onopen = function() {
      if(window._comm.connected)
        return;

      var b = window._comm.buffer;
      while(b.length)
        send(b.shift());
      window._comm.connected = true;

      window._comm.timer = setInterval(function() {
        if(window._comm.heartbeat)
          window._comm.heartbeat();
      }, 5000);

      console.log('ws connected');
      authyInit();
    }

    socket.onerror = function(err) {
      console.error(err);
    };

    window._comm.reload = socket.onclose = function(err) {
      console.log('ws disconnected; reloading page');
      window._comm.connected = false;
      // TODO display a dialog before redirecting
      window.location.href = '/'
    };

    socket.onmessage = function(packet) {
      console.log(packet.data);
      var msg = JSON.parse(packet.data);
      var rec = window._comm.requests[msg.id];
      if(!rec) {
        console.dir(msg);
        return console.error('unknown response id: ' + msg.id);
      }
      window._comm.requests[msg.id] = undefined;
      if(msg.err)
        rec.promise.reject(new Error(msg.err));
      else
        rec.promise.resolve(msg.data);
    };
  };

  connect();

})($);
