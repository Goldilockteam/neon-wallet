
window._comm = {
  counter: 0,
  requests: {}
};

var connect = function() {

  var socket = new WebSocket((location.protocol === 'https:'
    ? 'wss' : 'ws') + '://' + location.host + '/ws');

  window._comm.req = function(req) {
    req.id = 'req' + ++window._comm.counter;
    var rec = { req: req };
    window._comm.requests[rec.req.id] = rec;
    send(req);
    return new Promise(function(resolve, reject) {
      rec.promise = {
        resolve: resolve,
        reject: reject
      }
    });
  };

  var send = function(obj) {
    socket.send(JSON.stringify(obj))
  };

  socket.onopen = function() {
    console.log('ws connected');
  };

  socket.onerror = function(err) {
    console.error(err);
  };

  socket.onclose = function(err) {
    console.log('ws disconnected; reconnecting in 1s...');
    setTimeout(function() { connect(); }, 1000);
  };

  socket.onmessage = function(packet) {
    console.log(packet.data);
    var msg = JSON.parse(packet.data);
    var rec = window._comm.requests[msg.id];
    if(!rec)
      return console.error('unknown response id: ' + msg.id);
    window._comm.requests[msg.id] = undefined;
    if(msg.err)
      rec.promise.reject(new Error(msg.err));
    else
      rec.promise.resolve(msg.data);
  };
};

connect();
