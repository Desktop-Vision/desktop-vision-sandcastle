import { WebGLRenderer, ACESFilmicToneMapping, sRGBEncoding } from "three";
const Renderer = new WebGLRenderer({ antialias: true, alpha: true });
Renderer.setPixelRatio(window.devicePixelRatio);
Renderer.setSize(window.innerWidth, window.innerHeight);
Renderer.setClearColor(0x000000, 0.0);
Renderer.sortObjects = false;
Renderer.physicallyCorrectLights = true;
Renderer.xr.enabled = true;
Renderer.toneMapping = ACESFilmicToneMapping
Renderer.outputEncoding = sRGBEncoding
Renderer.xr.setFramebufferScaleFactor(2.0);
export default Renderer;
