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
	Keyboard, 
	MouseControls, 
	TouchControls, 
	KeyboardControls, 
	XRControls 
} = window.DesktopVision.loadSDK(THREE, XRControllerModelFactory, XRHandModelFactory);


let authToken = "", uid = "", computerId = ""

let computerConnection, code, token
let desktop, mouseControls, xrControls, touchControls, keyboardControls, keyboard;
let time = 0


const clientID = "6wlqRxEgp60JXkcGkLY2"; //must match the api key used on the server

const scene = new THREE.Scene();
const renderer = Renderer
const cubes = new Cubes(scene)
const lights = new Lights(scene)

const video = document.createElement('video')
const sceneContainer = Renderer.domElement

const keyboardOptions = {
  initialPosition: { x: 0, y: -0.325, z: 0 },
  initialScalar: 0.15,
  hideMoveIcon: true,
  hideResizeIcon: false,
}

const desktopOptions = {
  renderScreenBack: true,
  initialScalar: 0.00025,
  hideMoveIcon: false,
  hideResizeIcon: false,
  includeKeyboard: true,
  grabDistance: 0.5,
}

const xrControlsOptions = {
  hideHands: false,
  hideControllers: false
}

loadScene()
getDvCode()
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
  desktop = new Computer(video, renderer, computerConnection, Camera, false, desktopOptions);
  keyboard = new Keyboard(computerConnection, Camera, keyboardOptions)
  xrControls = new XRControls(renderer, Camera, scene, desktop, [], xrControlsOptions);
  mouseControls = new MouseControls(Camera, desktop, sceneContainer);
  touchControls = new TouchControls(Camera, desktop, sceneContainer);
  keyboardControls = new KeyboardControls(desktop)

  desktop.keyboard = keyboard
	desktop.setPosition({ x: 0, y: 0, z: -0.5 });
  
  State.eventHandler.addEventListener("selectstart", xrControls.onSelectStart);
  State.eventHandler.addEventListener("selectend", xrControls.onSelectEnd);

  scene.add(desktop.object3d)
  scene.add(xrControls.object3d)
}

scene.Update = () => {
  if (cubes) cubes.animate(time)
  if (desktop) desktop.update();
  if (keyboard) keyboard.update();
  if (mouseControls) mouseControls.update();
  if (xrControls) xrControls.update();

  time += 5
}

export { scene };
