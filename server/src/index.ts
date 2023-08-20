import express from 'express';
const app = express();
import cors from 'cors';
app.use(cors());
import { Server } from 'socket.io';
const server = app.listen('8000', () => console.log('Server is up, 8000'));
const io = new Server(server, { cors: { origin: '*' } });
import { handelStart, handelDisconnect, getType } from './lib';

let online: number = 0;
let roomArr: Array<any> = [];

io.on('connection', (socket) => {
  online++;
  io.emit('online', online);
  console.log('user connected', socket.id, online);

  // on start
  socket.on('start', cb => {
    handelStart(roomArr, socket, cb, io);
  })

  // On disconnection
  socket.on('disconnect', () => {
    online--;
    io.emit('online', online);
    handelDisconnect(socket.id, roomArr, io);
    console.log('user disconnected', socket.id, online);
  });




  /// ------- logic for webrtc connection ------

  // on ice send
  socket.on('ice:send', ({ candidate }) => {
    let type = getType(socket.id, roomArr);
    if (type?.type == 'p1') {
      io.to(type.p2id).emit('ice:reply', { candidate, from: socket.id });
      console.log(type.type, type.p2id, candidate);
    }
    else if (type?.type == 'p2') {
      io.to(type.p1id).emit('ice:reply', { candidate, from: socket.id });
      console.log(type.type, type.p1id, candidate);
    }
  });

  // on sdp send
  socket.on('sdp:send', ({ sdp }) => {
    let type = getType(socket.id, roomArr);
    if (type?.type == 'p1') {
      console.log(type.type,'sent p2id', type.p2id, sdp);
      io.to(type.p2id).emit('sdp:reply', { sdp, from: socket.id });
    }
    if (type?.type == 'p2') {
      console.log(type.type,'sent p1id', type.p1id, sdp);
      io.to(type.p1id).emit('sdp:reply', { sdp, from: socket.id });
    }
  })



  /// --------- Messages -----------
  // send message
  socket.on("send-message", (input, type, roomid) => {
    if (type == 'p1') type = 'You: ';
    else if (type == 'p2') type = 'Stranger: ';
    socket.to(roomid).emit('get-message', input, type);
    console.log(input, type, roomid);
  })

});
