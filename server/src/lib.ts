import {v4 as uuidv4} from 'uuid'

export function handelStart(roomArr: Array<any>, socket: any, cb: Function, io: any): void {

  // check available rooms
  let availableroom = checkAvailableRoom();
  if (availableroom.is) {
    socket.join(availableroom.roomid);
    cb('p2');
    closeRoom(availableroom.roomid);
    io.to(availableroom.room.p1.id).emit('remote-socket', socket.id);
    socket.emit('remote-socket', availableroom.room.p1.id);
    socket.emit('roomid', availableroom.room.roomid);
  }
  else {
    let roomid = uuidv4();
    socket.join(roomid);
    roomArr.push({
      roomid,
      isAvailable: true,
      p1: {
        id: socket.id,
      },
      p2:{
        id: null,
      }
    });
    cb('p1');
    socket.emit('roomid', roomid);
  }





  function closeRoom(roomid: string){
    for(let i = 0; i < roomArr.length; i++){
      if (roomArr[i].roomid == roomid){
        roomArr[i].isAvailable = false;
        roomArr[i].p2.id = socket.id;
        break;
      }
    }
  }

  function checkAvailableRoom(): {is:boolean, roomid: string, room: any} {
    for (let i = 0; i < roomArr.length; i++) {
      if (roomArr[i].isAvailable) {
        return {is:true, roomid: roomArr[i].roomid, room: roomArr[i]};
      }
      if (roomArr[i].p1.id == socket.id || roomArr[i].p2.id == socket.id) {
        return {is:false, roomid: "", room: null};
      }
    }
  
    return {is: false, roomid: '', room: null};
  }
}


export function handelDisconnect(disconnectedId: string, roomArr: Array<any>, io: any) {
  for(let i = 0; i < roomArr.length; i++) {
    if (roomArr[i].p1.id == disconnectedId){
      io.to(roomArr[i].p2.id).emit("disconnected");
      if(roomArr[i].p2.id){
        roomArr[i].isAvailable = true;
        roomArr[i].p1.id = roomArr[i].p2.id;
        roomArr[i].p2.id = null;
      }
      else {
        roomArr.splice(i, 1);
      }
    } else if (roomArr[i].p2.id == disconnectedId){
      io.to(roomArr[i].p1.id).emit("disconnected");
      if(roomArr[i].p1.id){
        roomArr[i].isAvailable = true;
        roomArr[i].p2.id = null;
      }
      else {
        roomArr.splice(i, 1);
      }
    }
  }
}

export function getType(id: string, roomArr: Array<any>){
  for(let i = 0; i < roomArr.length; i++) {
    if (roomArr[i].p1.id == id){
      return {type: 'p1', p2id: roomArr[i].p2.id};
    } else if (roomArr[i].p2.id == id){
      return {type: 'p2', p1id: roomArr[i].p1.id};
    }
  }
}