import { io } from 'socket.io-client';

// Global State
let peer;
const myVideo = document.getElementById('my-video');
const strangerVideo = document.getElementById('video');
const button = document.getElementById('send');
const online = document.getElementById('online');
let remoteSocket;
let type;
let roomid;


// starts media capture
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


// disconnectin event
socket.on('disconnected', () => {
  location.href = `/?disconnect`
})



/// --------- Web rtc related ---------

// Start 
socket.emit('start', (person) => {
  type = person;
});


// Get remote socket

socket.on('remote-socket', (id) => {
  remoteSocket = id;

  // hide the spinner
  document.querySelector('.modal').style.display = 'none';

  // create a peer conncection
  peer = new RTCPeerConnection();

  // on negociation needed 
  peer.onnegotiationneeded = async e => {
    webrtc();
  }

  // send ice candidates to remotesocket
  peer.onicecandidate = e => {
    socket.emit('ice:send', { candidate: e.candidate, to: remoteSocket });
  }

  // start media capture
  start();

});


// creates offer if 'type' = p1
async function webrtc() {

  if (type == 'p1') {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit('sdp:send', { sdp: peer.localDescription });
  }

}


// recive sdp sent by remote socket 
socket.on('sdp:reply', async ({ sdp, from }) => {

  // set remote description 
  await peer.setRemoteDescription(new RTCSessionDescription(sdp));

  // if type == p2, create answer
  if (type == 'p2') {
    const ans = await peer.createAnswer();
    await peer.setLocalDescription(ans);
    socket.emit('sdp:send', { sdp: peer.localDescription });
  }
});


// recive ice-candidate form remote socket
socket.on('ice:reply', async ({ candidate, from }) => {
  await peer.addIceCandidate(candidate);
});




/// ----------- Handel Messages Logic -----------


// get room id
socket.on('roomid', id => {
  roomid = id;
})

// handel send button click
button.onclick = e => {

  // get input and emit
  let input = document.querySelector('input').value;
  socket.emit('send-message', input, type, roomid);

  // set input in local message box as 'YOU'
  let msghtml = `
  <div class="msg">
  <b>You: </b> <span id='msg'>${input}</span>
  </div>
  `
  document.querySelector('.chat-holder .wrapper')
  .innerHTML += msghtml;

  // clear input
  document.querySelector('input').value = '';
}

// on get message
socket.on('get-message', (input, type) => {

  // set recived message from server in chat box
  let msghtml = `
  <div class="msg">
  <b>Stranger: </b> <span id='msg'>${input}</span>
  </div>
  `
  document.querySelector('.chat-holder .wrapper')
  .innerHTML += msghtml;

})