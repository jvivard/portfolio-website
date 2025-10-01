# My 3D Portfolio Website

## Draco 3D Data Compression

Draco is an open-source library for compressing and decompressing 3D geometric meshes and point clouds. It is intended to improve the storage and transmission of 3D graphics.

**3D Rendering:Three.js is the core engine, responsible for rendering the entire 3D scene, including the room model, lighting, and textures.
**Animations: The [GreenSock Animation Platform (GSAP)] was used to choreograph all the animations, from the smooth camera movements tied to the scrollbar to the subtle interactive effects.
**Build Tool:[Vite] provided a lightning-fast development environment and an optimized build process for production.
Deployment: The site is hosted on GitHub Pages



## Contents

This folder contains three utilities:

* `draco_decoder.js` — Emscripten-compiled decoder, compatible with any modern browser.
* `draco_decoder.wasm` — WebAssembly decoder, compatible with newer browsers and devices.
* `draco_wasm_wrapper.js` — JavaScript wrapper for the WASM decoder.

Each file is provided in two variations:

* **Default:** Latest stable builds, tracking the project's [master branch](https://github.com/google/draco).
* **glTF:** Builds targeted by the [glTF mesh compression extension](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_draco_mesh_compression), tracking the [corresponding Draco branch](https://github.com/google/draco/tree/gltf_2.0_draco_extension).

Either variation may be used with `THREE.DRACOLoader`:

```js
var dracoLoader = new THREE.DRACOLoader();
dracoLoader.setDecoderPath('path/to/decoders/');
dracoLoader.setDecoderConfig({type: 'js'}); // (Optional) Override detection of WASM support.
```

Further [documentation on GitHub](https://github.com/google/draco/tree/master/javascript/example#static-loading-javascript-decoder).

<h3 align="left"> Connect with me:</h3>
<div align="left">
  <a href="mailto:ggakavishnu@gmail.com">
    <img src="https://img.shields.io/badge/Mail-Contact-informational?style=for-the-badge&logo=gmail" alt="Mail" />
  </a>
  <a href="https://github.com/jvivard">
    <img src="https://img.shields.io/badge/GitHub-Follow-blue?style=for-the-badge&logo=github" alt="GitHub" />
  </a>
</div>


## License

[Apache License 2.0]
