(function($) {

  window._comm = {
    counter: 0,
    requests: {},
    connected: false,
    buffer: [],
    timer: setInterval(function() {
      if(window._comm.heartbeat)
        window._comm.heartbeat();
    }, 5000)
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
      if(window._comm.connected)
        socket.send('true');
    };

    var send = function(json) {
      if(!window._comm.connected)
        window._comm.buffer.push(json);
      else
        socket.send(json);
    };

    socket.onopen = function() {
      var b = window._comm.buffer;
      while(b.length)
        send(b.shift());
      window._comm.connected = true;
      console.log('ws connected');
      window._comm.req({ fn: 'authy-login-code' }).then(function(authyCode) {
        $('#gd-authy-code').text(authyCode);
        window._comm.req({ fn: 'authy-login-confirm' }).then(function(approved) {
          if(approved) {
            $('#gd-authy').remove();
            $('body').append('<script type="text/javascript" src="bundle.js"></script>')
          }
        });
      });
    };

    socket.onerror = function(err) {
      console.error(err);
    };

    socket.onclose = function(err) {
      window._comm.connected = false;
      // TODO display a dialog before redirecting
      window.location.href = '/'
    };

    socket.onmessage = function(packet) {
      console.log(packet.data);
      var msg = JSON.parse(packet.data);
      var rec = window._comm.requests[msg.id];
      if(!rec) {
        console.dir(msg)
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
