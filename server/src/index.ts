import express from 'express';
const app = express();
import cors from 'cors';
app.use(cors());
import { Server } from 'socket.io';
const server = app.listen('8000', () => console.log('Server is up, 8000'));
const io = new Server(server, { cors: { origin: '*' } });
import { handelStart, handelDisconnect, getType } from './lib';
import { GetTypesResult, room } from './types';

let online: number = 0;
let roomArr: Array<room> = [];

io.on('connection', (socket) => {
  online++;
  io.emit('online', online);

  // on start
  socket.on('start', cb => {
    handelStart(roomArr, socket, cb, io);
  })

  // On disconnection
  socket.on('disconnect', () => {
    online--;
    io.emit('online', online);
    handelDisconnect(socket.id, roomArr, io);
  });




  /// ------- logic for webrtc connection ------

  // on ice send
  socket.on('ice:send', ({ candidate }) => {
    let type: GetTypesResult = getType(socket.id, roomArr);
    if (type) {
      if (type?.type == 'p1') {
        typeof (type?.p2id) == 'string'
          && io.to(type.p2id).emit('ice:reply', { candidate, from: socket.id });
      }
      else if (type?.type == 'p2') {
        typeof (type?.p1id) == 'string'
          && io.to(type.p1id).emit('ice:reply', { candidate, from: socket.id });
      }
    }
  });

  // on sdp send
  socket.on('sdp:send', ({ sdp }) => {
    let type = getType(socket.id, roomArr);
    if (type) {
      if (type?.type == 'p1') {
        typeof (type?.p2id) == 'string'
          && io.to(type.p2id).emit('sdp:reply', { sdp, from: socket.id });
      }
      if (type?.type == 'p2') {
        typeof (type?.p1id) == 'string'
          && io.to(type.p1id).emit('sdp:reply', { sdp, from: socket.id });
      }
    }
  })



  /// --------- Messages -----------

  // send message
  socket.on("send-message", (input, type, roomid) => {
    if (type == 'p1') type = 'You: ';
    else if (type == 'p2') type = 'Stranger: ';
    socket.to(roomid).emit('get-message', input, type);
  })

});
