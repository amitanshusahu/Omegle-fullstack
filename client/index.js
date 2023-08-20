import { io } from 'socket.io-client';

// Global State
let peer;
const myVideo = document.getElementById('my-video');
const strangerVideo = document.getElementById('video');
const button = document.getElementById('send');
let remoteSocket;
let type;
let roomid;


// start media capture
function start() {
  navigator.mediaDevices.getUserMedia({ audio: true, video: true })
    .then(stream => {
      if (peer) {
        myVideo.srcObject = stream;
        stream.getTracks().forEach(track => peer.addTrack(track, stream));

        peer.ontrack = e => {
          strangerVideo.srcObject = e.streams[0];
          strangerVideo.play();
        }

      }
    })
    .catch(ex => {
      console.log(ex);
    });
}





// connect ot server
const socket = io('http://localhost:8000');
socket.on('connect', () => {
  console.log(socket.id);
})

// disconnectin event
socket.on('disconnected', () => {
  location.href = `/?disconnect`
})




/// ------- Web rtc related -------

// start 
socket.emit('start', (person) => {
  type = person;

});

// get remote socket
socket.on('remote-socket', (id) => {
  remoteSocket = id;
  document.querySelector('.modal').style.display = 'none';
  console.log("remote socket", remoteSocket);
  peer = new RTCPeerConnection();

  // on negociation needed 
  peer.onnegotiationneeded = async e => {
    webrtc();
  }

  // send ice candidates
  peer.onicecandidate = e => {
    console.log('ice to', remoteSocket, e.candidate);
    socket.emit('ice:send', { candidate: e.candidate, to: remoteSocket });
  }

  // state cahnge
  peer.oniceconnectionstatechange = e => {
    console.log('ice connection state:', e.iceConnectionState);
  }

  start();
});

// @desc : creates offer if it's p1
async function webrtc() {
  console.log(type, type == 'p1', 'offer');
  if (type == 'p1') {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit('sdp:send', { sdp: peer.localDescription });
    console.log('sdp send p1', peer.localDescription);
  }

}

// recive sdp
socket.on('sdp:reply', async ({ sdp, from }) => {
  console.log('recived sdp from', from, sdp);
  await peer.setRemoteDescription(new RTCSessionDescription(sdp));

  console.log(type, type == 'p1', 'reply');
  console.log(type, type == 'p2', 'reply');
  if (type == 'p2') {
    const ans = await peer.createAnswer();
    await peer.setLocalDescription(ans);
    socket.emit('sdp:send', { sdp: peer.localDescription });
    console.log('sdp send p2', peer.localDescription);
  }
});

// recive ice
socket.on('ice:reply', async ({ candidate, from }) => {
  console.log('ice from', from, candidate);
  await peer.addIceCandidate(candidate);
});



/// ----------- Messages -----------

socket.on('roomid', id => {
  roomid = id;
})

button.onclick = e => {
  let input = document.querySelector('input').value;
  console.log('working', input);
  socket.emit('send-message', input, type, roomid);

  let msghtml = `<div class="msg">
  <b>You: </b> <span id='msg'>${input}</span>
  </div>`
  document.querySelector('.chat-holder .wrapper').innerHTML += msghtml;
}

socket.on('get-message', (input, type) => {
  console.log(input, type);
  let msghtml = `<div class="msg">
  <b>Stranger: </b> <span id='msg'>${input}</span>
  </div>`
  document.querySelector('.chat-holder .wrapper').innerHTML += msghtml;
})