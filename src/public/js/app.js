const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const call = document.getElementById("call");

call.hidden = true;

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let userName = "";
let myPeerConnection;

async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");
    const currentCamera = myStream.getVideoTracks()[0];
    cameras.forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.innerText = camera.label;
      if (currentCamera.label === camera.label) {
        option.selected = true;
      }
      camerasSelect.appendChild(option);
    });
  } catch (e) {
    console.log(e);
  }
}

async function getMedia(deviceId) {
  const initialConstrains = {
    audio: true,
    video: { facingMode: "user" }
  };
  const cameraConstraints = {
    audio: true,
    video: { deviceId: { exact: deviceId } }
  };
  try {
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? cameraConstraints : initialConstrains
    );
    myFace.srcObject = myStream;
    if (!deviceId) {
      await getCameras();
    }
  } catch (e) {
    console.log(e);
  }
}

function handleMuteClick() {
  myStream
    .getAudioTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (!muted) {
    muteBtn.innerText = "Unmute";
    muted = true;
  } else {
    muteBtn.innerText = "Mute";
    muted = false;
  }
}

function handleCameraClick() {
  myStream
    .getVideoTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (cameraOff) {
    cameraBtn.innerText = "Turn Camera Off";
    cameraOff = false;
  } else {
    cameraBtn.innerText = "Turn Camera On";
    cameraOff = true;
  }
}

async function handleCameraChange() {
  await getMedia(camerasSelect.value);
  if (myPeerConnection) {
    const videoTrack = myStream.getVideoTracks()[0];
    const videoSender = myPeerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video");
    videoSender.replaceTrack(videoTrack);
  }
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);

// Welcome Form

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

async function initCall() {
  welcome.hidden = true;
  call.hidden = false;
  await getMedia();
  makeConnection();
}

const chat = document.getElementById("chatWindow");
const msgForm = document.getElementById("chatMsg");

function printNewMsg(user, message) {
  const ul = chat.querySelector("ul");
  const li = document.createElement("li");
  let name;

  if (user !== userName) {
    name = document.createElement("span");
  } else {
    name = document.createElement("p");
  }
  name.innerText = user;
  li.innerText = message;
  name.appendChild(li);
  ul.appendChild(name);
}

function handleMessageSubmit(event) {
  event.preventDefault();
  const msgInput = msgForm.querySelector("#message");
  const msg = msgInput.value;
  socket.emit("new_message", msg, roomName, () => {
    printNewMsg(userName, msg);
  });
  msgInput.value = "";
}

function roomNameView() {
  const roomAndUser = document.getElementById("whatRoomName");
  roomAndUser.innerText = `Room: ${roomName}`;
  msgForm.addEventListener("submit", handleMessageSubmit);
  socket.on("new_message", printNewMsg);
}

async function handleWelcomeSubmit(event) {
  event.preventDefault();
  const roomInput = welcomeForm.querySelector("#roomName");
  const nickInput = welcomeForm.querySelector("#nickName");
  await initCall();
  roomName = roomInput.value;
  userName = nickInput.value;
  socket.emit("join_room", roomName, userName, roomNameView);

  roomInput.value = "";
  nickInput.value = "";
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

//Socket Code

socket.on("welcome", async () => {
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  console.log("sent the offer");
  socket.emit("offer", offer, roomName);
});

socket.on("offer", async (offer) => {
  console.log("received the offer");
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
  console.log("sent the answer");
});

socket.on("answer", (answer) => {
  console.log("received the answer");
  myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
  console.log("received candidate");
  myPeerConnection.addIceCandidate(ice);
});

//RTC Code

function makeConnection() {
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          //only test usage. get public address
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302"
        ]
      }
    ]
  });
  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("addstream", handleAddStream);
  //myPeerConnection.addEventListener("track", handleTrack);
  myPeerConnection.addEventListener("close", () => {
    const ul = chat.querySelector("ul");
    const span = document.createElement("span");
    const leftMsg = `${userName} left the room.`;
    span.innerText = leftMsg;
    ul.append(span); //append?
    //카메라 연결 끊기 미완성
  });

  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream));
}

function handleIce(data) {
  console.log("sent candidate");
  socket.emit("ice", data.candidate, roomName);
}

function handleAddStream(data) {
  const peerFace = document.getElementById("peerFace");
  peerFace.srcObject = data.stream;
}

//function handleTrack(data) {
//휴대폰) 카메라 바꾸면 mute 풀림 해결하기, 카메라 실제 전환 안 됨
//  console.log("handle track");
//  const peerFace = document.querySelector("#peerFace");
//  peerFace.srcObject = data.streams[0];
//}
