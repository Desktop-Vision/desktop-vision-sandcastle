import Cubes from '../src/misc/Cubes'
import Lights from '../src/misc/Lights'
import Renderer from './engine/renderer';
import Camera from './engine/camera';
import State from "./engine/state";

import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory'
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js'

const {
  Computer,
  ComputerConnection,
} = window.DesktopVision.loadSDK(THREE, XRControllerModelFactory, XRHandModelFactory);


let authToken = "", uid = "", computerId = ""

let computerConnection, code, token
let desktop, mouseControls, xrControls, touchControls, keyboardControls, keyboard;
let time = 0


const clientID = "JVweYEBkjNZBneYdSBf0"; //must match the api key used on the server

const scene = new THREE.Scene();
const renderer = Renderer
const cubes = new Cubes(scene)
const lights = new Lights(scene)

const video = document.createElement('video')
const sceneContainer = Renderer.domElement

loadScene()
getDvCode()
// createTestComputer()
checkForCode()

function loadScene() {
  cubes.addToScene()
  lights.addToScene()
}

function checkForCode() {
  const urlParams = new URLSearchParams(window.location.search);
  code = urlParams.get("code");
  computerId = urlParams.get("computer_id");
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
    video.srcObject = newStream;
    video.muted = true
    video.play();

    createComputer();
  });
}

function createComputer() {
	const desktopOptions = {
		renderScreenBack: true,
		initialScalar: 0.0005,
		initialPosition: { x: 0, y: 0, z: 1 },
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
	desktop.position.y = 0
	desktop.position.z = -1
  scene.add(desktop)
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
  if (cubes) cubes.animate(time)
  if (desktop) desktop.update();

  time += 5
}

export { scene };
