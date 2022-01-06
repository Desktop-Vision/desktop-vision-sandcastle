import Renderer from './engine/renderer';
import Camera from './engine/camera';

import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory'
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js'
import MultiAppManager from "@plutovr/multi-app-manager";

const {
  Computer,
  ComputerConnection,
} = window.DesktopVision.loadSDK(THREE, XRControllerModelFactory, XRHandModelFactory);


let authToken = "", uid = "", computerId = ""

let computerConnection, code, token, sharedRoom
let desktop
let time = 0


const clientID = "JVweYEBkjNZBneYdSBf0"; //must match the api key used on the server

const scene = new THREE.Scene();
const renderer = Renderer

const video = document.createElement('video')
const sceneContainer = Renderer.domElement



function createSharedRoom() {
  const appId = MultiAppManager.getAppState().appId;

  const method = "POST"
  const body = JSON.stringify({})
  const headers = { "Content-Type": "application/json" };
  const fetchOptions = { method, body, headers };
  const apiEndPoint = `https://desktop.vision/api/xrpk/connect?channel_name=${appId}`;
  fetch(apiEndPoint, fetchOptions).then(response => {
    return response.json();
  }).then(data => {
    const { roomOptions } = data
    sharedRoom = new ComputerConnection(roomOptions.data);
    sharedRoom.on('data', parseRoomData)
    sharedRoom.on("stream-added", handleSharedStream);
  })
}

function handleSharedStream(newStream) {
  MultiAppManager.getOwnerData().then(data => {
    const { isOwner } = data
    if (!isOwner) {
      video.srcObject = newStream;
      video.muted = true
      video.play();
      createComputer()
    }
  })
}

function parseRoomData(roomData) {
  const data = JSON.parse(roomData)
  if (data.screenPosition) handleDesktopReposition(data)
}

function handleDesktopReposition(data) {
  if (!desktop) return
  desktop.position.copy(data.screenPosition)
  desktop.rotation.copy(data.screenRotation)
  desktop.scale.set(data.screenScale.x, data.screenScale.y, data.screenScale.z)
}

function getDvCode() {
  if (code) return
  const scope = encodeURIComponent("connect,list");

  const redirectURL = new URL(window.location.href);
  redirectURL.searchParams.set("oauth", "desktopvision");
  const redirectUri = encodeURIComponent(redirectURL);

  const method = 'popup' // change this to something else for same window auth
  if (method === 'popup') {
    const newWindow = window.open(`https://desktop.vision/login/?response_type=code&client_id=${clientID}&scope=${scope}&redirect_uri=${redirectUri}&redirect_type=popup&selectComputer=true`);
    window.onmessage = function (e) {
      code = e.data.code
      computerId = e.data.computerId
      if (code && computerId) {
        newWindow.close()
        connectToDV()
      }
    };
  } else {
    window.location.href = `https://desktop.vision/login/?response_type=code&client_id=${clientID}&scope=${scope}&redirect_uri=${redirectUri}&selectComputer=${selectComputer}`;
  }
}

function connectToDV() {
  if (!code) return
  fetch(`/api/desktop-vision-auth?code=${code}`).then(response => {
    response.json().then(userData => {
      token = userData.token;
      authToken = token.access_token
      uid = token.uid
      fetchComputer()
      clearUrlParams();
    })
  }).catch(e => {
    console.log(e)
  })
}

function clearUrlParams() {
  const url = new URL(location.href);
  url.searchParams.delete("oauth");
  url.searchParams.delete("code");
  url.searchParams.delete("code");
  url.searchParams.delete("computer_id");
  window.history.replaceState({}, "", url);
  code = null;
}

function fetchComputer() {
  const apiEndPoint = `https://desktop.vision/api/users/${uid}/computers?access_token=${authToken}`;
  fetch(apiEndPoint).then(res => {
    res.json().then(computers => {
      const computer = computers.find(c => c.id === computerId)
      connectToComputer(computer)
    })
  })
}

function connectToComputer(computer) {
  const method = "POST"
  const body = JSON.stringify({ "channel_name": computer.channel_name })
  const headers = { "Content-Type": "application/json" };
  const fetchOptions = { method, body, headers };
  const apiEndPoint = `https://desktop.vision/api/connect?access_token=${authToken}`;
  fetch(apiEndPoint, fetchOptions).then(res => {
    res.json().then(resJson => {
      const { roomOptions } = resJson
      createComputerConnection(roomOptions)
    })
  }).catch(e => {
    console.log(e)
  })
}

function createComputerConnection(connectionOptions) {
  if (computerConnection) computerConnection = null;
  computerConnection = new ComputerConnection(connectionOptions);
  computerConnection.on("stream-added", (newStream) => {
    sharedRoom.addStream(newStream)
    video.srcObject = newStream;
    video.muted = true
    video.play();
    createComputer()
  });
}

function createComputer() {
  if (desktop) {
    scene.remove(desktop)
    desktop.destroy()
  }
  const desktopOptions = {
    renderScreenBack: true,
    initialScalar: 1,
    initialWidth: 1,
    hideMoveIcon: false,
    hideResizeIcon: false,
    includeKeyboard: true,
    grabDistance: 1,
    renderAsLayer: false,
    keyboardOptions: {
      hideMoveIcon: false,
      hideResizeIcon: false,
    },
    xrOptions: {
      hideControllers: false,
      hideHands: false,
      hideCursors: false
    }
  }

  desktop = new Computer(scene, sceneContainer, video, renderer, computerConnection, Camera, desktopOptions);
  desktop.position.y = 1.6
  desktop.position.z = -1

  scene.add(desktop)
}

function propogateDesktopState() {
  if (!desktop) return
  if (desktop.isMoving || desktop.isResizing) {
    const data = {
      screenPosition: desktop.position,
      screenScale: desktop.scale,
      screenRotation: desktop.rotation,
      sender: sharedRoom.localParticipant
    }
    sharedRoom.send(JSON.stringify(data))
  }
}

function createTestComputer(){
	video.setAttribute('webkit-playsinline', 'webkit-playsinline');
	video.setAttribute('playsinline', 'playsinline');
	video.src = '/dvVid.mp4';
	video.muted = true
	video.play();

  createComputer()
}

scene.Update = () => {
  if (desktop) desktop.update();
  propogateDesktopState()

  time += 5
}

MultiAppManager.getOwnerData().then(data => {
  const { isOwner } = data
  if (isOwner) {
    getDvCode()
  }
})

createSharedRoom()
export { scene };
