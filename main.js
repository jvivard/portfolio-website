import './style.css';
import * as THREE from 'three';
import * as dat from 'dat.gui';
import gsap from 'gsap';
import Stats from 'three/addons/libs/stats.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

// VARIABLES
let theme = 'light';
let bookCover = null;
let lightSwitch = null;
let titleText = null;
let subtitleText = null;
let mixer;
let isMobile = window.matchMedia('(max-width: 992px)').matches;
let canvas = document.querySelector('.experience-canvas');
const loaderWrapper = document.getElementById('loader-wrapper');
let clipNames = [
  'fan_rotation',
  'fan_rotation.001',
  'fan_rotation.002',
  'fan_rotation.003',
  'fan_rotation.004',
];
let projects = [];
let currentProjectIndex = 0;
let aboutCameraPos = {
  x: 0.12,
  y: 0.2,
  z: 0.55,
};
let aboutCameraRot = {
  x: -1.54,
  y: 0.13,
  z: 1.41,
};
let projectsCameraPos = {
  x: 1,
  y: 0.45,
  z: 0.01,
};
let projectsCameraRot = {
  x: 0.05,
  y: 0.05,
  z: 0,
};

// SCENE & CAMERA
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.01,
  1000
);
let defaultCameraPos = {
  x: 1.009028643133046,
  y: 0.5463638814987481,
  z: 0.4983449671971262,
};
let defaultCamerRot = {
  x: -0.8313297556598935,
  y: 0.9383399492446749,
  z: 0.7240714481613063,
};
camera.position.set(defaultCameraPos.x, defaultCameraPos.y, defaultCameraPos.z);

// RENDERER
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// STATS
// const stats = new Stats();
// document.querySelector('.experience').appendChild(stats.dom);

// CONTROLS
const controls = new OrbitControls(camera, renderer.domElement);
// controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 0.9;
controls.maxDistance = 1.6;
controls.minAzimuthAngle = 0.2;
controls.maxAzimuthAngle = Math.PI * 0.78;
controls.minPolarAngle = 0.3;
controls.maxPolarAngle = Math.PI / 2;
controls.update();

// LOAD MODEL & ASSET
// const loadingManager = new THREE.LoadingManager();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('draco/');
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
gltfLoader.load(
  'models/room.glb',
  function (room) {
    // hide loader on loade
    loaderWrapper.style.display = 'none';

    // load video
    const video = document.createElement('video');
    video.src = 'textures/shin.mp4';
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.loop = true;

    // create video texture
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.NearestFilter;
    videoTexture.magFilter = THREE.NearestFilter;
    videoTexture.generateMipmaps = false;
    videoTexture.encoding = THREE.sRGBEncoding;

    room.scene.children.forEach((child) => {
      // disable shadow by wall
      if (child.name !== 'Wall') {
        child.castShadow = true;
      }
      child.receiveShadow = true;

      if (child.children) {
        child.children.forEach((innerChild) => {
          // disable shadow by book cover & switch btn
          if (innerChild.name !== 'Book001' && innerChild.name !== 'Switch') {
            innerChild.castShadow = true;
          }
          innerChild.receiveShadow = true;
        });
      }

      if (child.name === 'Stand') {
        child.children[0].material = new THREE.MeshBasicMaterial({
          map: videoTexture,
        });
        video.play();
      }

      // transparent texture for glass
      if (child.name === 'CPU') {
        child.children[0].material = new THREE.MeshPhysicalMaterial();
        child.children[0].material.roughness = 0;
        child.children[0].material.color.set(0x999999);
        child.children[0].material.ior = 3;
        child.children[0].material.transmission = 2;
        child.children[0].material.opacity = 0.8;
        child.children[0].material.depthWrite = false;
        child.children[0].material.depthTest = false;
        child.children[1].material = new THREE.MeshPhysicalMaterial();
        child.children[1].material.roughness = 0;
        child.children[1].material.color.set(0x999999);
        child.children[1].material.ior = 3;
        child.children[1].material.transmission = 1;
        child.children[1].material.opacity = 0.8;
        child.children[1].material.depthWrite = false;
        child.children[1].material.depthTest = false;
      }

      if (child.name === 'Book') {
        bookCover = child.children[0];

        // adding texture to book
        const bookTexture = new THREE.TextureLoader().load(
          'textures/vivardo.png'
        );
        bookTexture.flipY = false;
        // bookTexture.encoding = THREE.sRGBEncoding; // Reverted to Linear for brightness
        child.material = new THREE.MeshBasicMaterial({
          map: bookTexture,
        });
      }

      if (child.name === 'SwitchBoard') {
        lightSwitch = child.children[0];
      }
    });

    scene.add(room.scene);
    animate();

    // add animation
    mixer = new THREE.AnimationMixer(room.scene);
    const clips = room.animations;
    clipNames.forEach((clipName) => {
      const clip = THREE.AnimationClip.findByName(clips, clipName);
      if (clip) {
        const action = mixer.clipAction(clip);
        action.play();
      }
    });

    loadIntroText();

    // add event listeners
    logoListener();
    aboutMenuListener();
    init3DWorldClickListeners();
    initResponsive(room.scene);

    // Fetch projects then initialize menu
    fetch('data.json')
      .then((response) => response.json())
      .then((data) => {
        projects = data;
        projectsMenuListener();
      })
      .catch((error) => console.error('Error loading project data:', error));

  },
  function (error) {
    console.error(error);
  }
);

// ADD LIGHT
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const roomLight = new THREE.PointLight(0xffffff, 2.5, 10);
roomLight.position.set(0.3, 2, 0.5);
roomLight.castShadow = true;
roomLight.shadow.radius = 5;
roomLight.shadow.mapSize.width = 2048;
roomLight.shadow.mapSize.height = 2048;
roomLight.shadow.camera.far = 2.5;
// roomLight.shadow.camera.fov = 100;
roomLight.shadow.bias = -0.002;
scene.add(roomLight);
// add light for pc fans
const fanLight1 = new THREE.PointLight(0xff0000, 30, 0.2);
const fanLight2 = new THREE.PointLight(0x00ff00, 30, 0.12);
const fanLight3 = new THREE.PointLight(0x00ff00, 30, 0.2);
const fanLight4 = new THREE.PointLight(0x00ff00, 30, 0.2);
const fanLight5 = new THREE.PointLight(0x00ff00, 30, 0.05);
fanLight1.position.set(0, 0.29, -0.29);
fanLight2.position.set(-0.15, 0.29, -0.29);
fanLight3.position.set(0.21, 0.29, -0.29);
fanLight4.position.set(0.21, 0.19, -0.29);
fanLight5.position.set(0.21, 0.08, -0.29);
scene.add(fanLight1);
scene.add(fanLight2);
scene.add(fanLight3);
scene.add(fanLight4);
scene.add(fanLight5);
// add point light for text on wall
const pointLight1 = new THREE.PointLight(0xff0000, 0, 1.1);
const pointLight2 = new THREE.PointLight(0xff0000, 0, 1.1);
const pointLight3 = new THREE.PointLight(0xff0000, 0, 1.1);
const pointLight4 = new THREE.PointLight(0xff0000, 0, 1.1);
pointLight1.position.set(-0.2, 0.6, 0.24);
pointLight2.position.set(-0.2, 0.6, 0.42);
pointLight3.position.set(-0.2, 0.6, 0.01);
pointLight4.position.set(-0.2, 0.6, -0.14);
scene.add(pointLight1);
scene.add(pointLight2);
scene.add(pointLight3);
scene.add(pointLight4);

// SETUP HELPERS
// const axesHelper = new THREE.AxesHelper(5);
// scene.add(axesHelper);
// const gridHelper = new THREE.GridHelper(30, 30);
// scene.add(gridHelper);
// const shadowCameraHelper = new THREE.CameraHelper(roomLight.shadow.camera);
// scene.add(shadowCameraHelper);
// const pointLightHelper = new THREE.PointLightHelper(fanLight3, 0.03);
// scene.add(pointLightHelper);

// ADD GUI
// const gui = new dat.GUI();
// const options = {
//   lightX: 0,
//   lightY: 0.08,
//   lightZ: 0,
// };
// gui.add(options, 'lightX').onChange((e) => {
//   mobileLight.position.setX(e);
// });
// gui.add(options, 'lightY').onChange((e) => {
//   mobileLight.position.setY(e);
// });
// gui.add(options, 'lightZ').onChange((e) => {
//   mobileLight.position.setZ(e);
// });

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  // controls.update();
  if (mixer) {
    mixer.update(clock.getDelta());
  }
  renderer.render(scene, camera);
  // stats.update();
}

function loadIntroText() {
  const loader = new FontLoader();
  loader.load('fonts/unione.json', function (font) {
    const textMaterials = [
      new THREE.MeshPhongMaterial({ color: 0x171f27, flatShading: true }),
      new THREE.MeshPhongMaterial({ color: 0xffffff }),
    ];
    const titleGeo = new TextGeometry('J Vishnu Vardhan', {
      font: font,
      size: 0.08,
      height: 0.01,
    });
    titleText = new THREE.Mesh(titleGeo, textMaterials);
    titleText.rotation.y = Math.PI * 0.5;
    titleText.position.set(-0.27, 0.55, 0.5);
    scene.add(titleText);
  });

  loader.load('fonts/helvatica.json', function (font) {
    const textMaterials = [
      new THREE.MeshPhongMaterial({ color: 0x171f27, flatShading: true }),
      new THREE.MeshPhongMaterial({ color: 0xffffff }),
    ];
    const subTitleGeo = new TextGeometry(
      'Product-Focused Builder / AI & Startups / Hackathon Experience',
      {
        font: font,
        size: 0.018,
        height: 0,
      }
    );
    subtitleText = new THREE.Mesh(subTitleGeo, textMaterials);
    subtitleText.rotation.y = Math.PI * 0.5;
    subtitleText.position.set(-0.255, 0.5, 0.5);
    scene.add(subtitleText);
  });
}

function switchTheme(themeType) {
  if (themeType === 'dark') {
    lightSwitch.rotation.z = Math.PI / 7;
    document.body.classList.remove('light-theme');
    document.body.classList.add('dark-theme');

    // main lights
    gsap.to(roomLight.color, {
      r: 0.27254901960784313,
      g: 0.23137254901960785,
      b: 0.6862745098039216,
    });
    gsap.to(ambientLight.color, {
      r: 0.17254901960784313,
      g: 0.23137254901960785,
      b: 0.6862745098039216,
    });
    gsap.to(roomLight, {
      intensity: 1.5,
    });
    gsap.to(ambientLight, {
      intensity: 0.3,
    });

    // fan lights
    gsap.to(fanLight5, {
      distance: 0.07,
    });

    // text color
    gsap.to(titleText.material[0].color, {
      r: 8,
      g: 8,
      b: 8,
      duration: 0,
    });
    gsap.to(titleText.material[1].color, {
      r: 5,
      g: 5,
      b: 5,
      duration: 0,
    });
    gsap.to(subtitleText.material[0].color, {
      r: 8,
      g: 8,
      b: 8,
      duration: 0,
    });
    gsap.to(subtitleText.material[1].color, {
      r: 5,
      g: 5,
      b: 5,
      duration: 0,
    });

    // text light
    gsap.to(pointLight1, {
      intensity: 0.6,
    });
    gsap.to(pointLight2, {
      intensity: 0.6,
    });
    gsap.to(pointLight3, {
      intensity: 0.6,
    });
    gsap.to(pointLight4, {
      intensity: 0.6,
    });
  } else {
    lightSwitch.rotation.z = 0;
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');

    // main light
    gsap.to(roomLight.color, {
      r: 1,
      g: 1,
      b: 1,
    });
    gsap.to(ambientLight.color, {
      r: 1,
      g: 1,
      b: 1,
    });
    gsap.to(roomLight, {
      intensity: 2.5,
    });
    gsap.to(ambientLight, {
      intensity: 0.6,
    });

    // fan light
    gsap.to(fanLight5, {
      distance: 0.05,
    });

    // text color
    gsap.to(titleText.material[0].color, {
      r: 0.09019607843137255,
      g: 0.12156862745098039,
      b: 0.15294117647058825,
      duration: 0,
    });
    gsap.to(titleText.material[1].color, {
      r: 1,
      g: 1,
      b: 1,
      duration: 0,
    });
    gsap.to(subtitleText.material[0].color, {
      r: 0.09019607843137255,
      g: 0.12156862745098039,
      b: 0.15294117647058825,
      duration: 0,
    });
    gsap.to(subtitleText.material[1].color, {
      r: 1,
      g: 1,
      b: 1,
      duration: 0,
    });

    // text light
    gsap.to(pointLight1, {
      intensity: 0,
    });
    gsap.to(pointLight2, {
      intensity: 0,
    });
    gsap.to(pointLight3, {
      intensity: 0,
    });
    gsap.to(pointLight4, {
      intensity: 0,
    });
  }
}

function enableOrbitControls() {
  controls.enabled = true;
}

function disableOrbitControls() {
  controls.enabled = false;
}

function enableCloseBtn() {
  document.getElementById('close-btn').style.display = 'block';
}

function disableCloseBtn() {
  document.getElementById('close-btn').style.display = 'none';
}

function resetBookCover() {
  if (!bookCover) return;

  gsap.to(bookCover.rotation, {
    x: 0,
    duration: 1.5,
  });
}

function resetProjects() {
  if (projects.length === 0) return;

  projects.forEach((project, i) => {
    gsap.to(project.mesh.material, {
      opacity: 0,
      duration: 1,
    });
    gsap.to(project.mesh.position, {
      y: project.y,
      duration: 1,
    });
    gsap.to(project.mesh.scale, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0,
      delay: 1,
    });
  });
}

function resetCamera() {
  resetBookCover();
  resetProjects();
  disableCloseBtn();
  gsap.to(camera.position, {
    ...defaultCameraPos,
    duration: 1.5,
  });
  gsap.to(camera.rotation, {
    ...defaultCamerRot,
    duration: 1.5,
  });
  gsap.delayedCall(1.5, enableOrbitControls);

  // reset dimmed light for about display
  if (theme !== 'dark') {
    gsap.to(roomLight, {
      intensity: 2.5,
      duration: 1.5,
    });
  }
}

function logoListener() {
  document.getElementById('logo').addEventListener('click', function (e) {
    e.preventDefault();
    resetCamera();
  });
}

function cameraToAbout() {
  if (!bookCover) return;

  gsap.to(camera.position, {
    ...aboutCameraPos,
    duration: 1.5,
  });
  gsap.to(camera.rotation, {
    ...aboutCameraRot,
    duration: 1.5,
  });
  gsap.to(bookCover.rotation, {
    x: Math.PI,
    duration: 1.5,
    delay: 1.5,
  });

  // prevent about text clutter due to bright light
  if (theme !== 'dark') {
    gsap.to(roomLight, {
      intensity: 1,
      duration: 1.5,
    });
  }
}

function aboutMenuListener() {
  document.getElementById('about-menu').addEventListener('click', function (e) {
    e.preventDefault();
    disableOrbitControls();
    resetProjects();
    cameraToAbout();
    gsap.delayedCall(1.5, enableCloseBtn);
  });
}

function projectsMenuListener() {
  // create project planes with textures
  projects.forEach((project, i) => {
    const colIndex = i % 3 === 0 ? 0 : 1;
    const rowIndex = Math.floor(i / 3);

    // Vertical Geometry (Story Style) - Larger
    // 0.75 width x 1.3 height
    const geometry = new THREE.PlaneGeometry(0.75, 1.3);

    // Create dynamic texture
    const texture = createCardTexture(project);

    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: texture,
      transparent: true,
      opacity: 0.0,
    });
    const projectPlane = new THREE.Mesh(geometry, material);
    projectPlane.name = 'project';
    projectPlane.userData = {
      id: project.id,
      index: i
    };

    // Adjusted positioning to center cards vertically
    // Moved down from 1.0 to 0.4
    projectPlane.position.set(
      0.3 + i * 0.85 * colIndex, // Increased spacing for wider cards
      0.4 - rowIndex * 0.6,      // Lower starting Y
      -1.15
    );
    projectPlane.scale.set(0, 0, 0); // Start hidden

    // mesh & y vars needed for animation
    projects[i].mesh = projectPlane;
    projects[i].y = 0.4 - rowIndex * 0.6;
    scene.add(projectPlane);
  });

  document
    .getElementById('projects-menu')
    .addEventListener('click', function (e) {
      e.preventDefault();
      disableOrbitControls();
      resetBookCover();
      gsap.to(camera.position, {
        ...projectsCameraPos,
        duration: 1.5,
      });
      gsap.to(camera.rotation, {
        ...projectsCameraRot,
        duration: 1.5,
      });
      gsap.delayedCall(1.5, enableCloseBtn);

      // animate & show project items
      projects.forEach((project, i) => {
        project.mesh.scale.set(1, 1, 1);
        gsap.to(project.mesh.material, {
          opacity: 1,
          duration: 1.5,
          delay: 1.5 + i * 0.1,
        });
        gsap.to(project.mesh.position, {
          y: project.y + 0.05,
          duration: 1,
          delay: 1.5 + i * 0.1,
        });
      });
    });
}

function init3DWorldClickListeners() {
  const mousePosition = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  let intersects;

  window.addEventListener('click', function (e) {
    // store value set to prevent multi time update in foreach loop
    const newTheme = theme === 'light' ? 'dark' : 'light';

    // prevent about focus on button click which are positioned above book in mobile view
    const projectsBtn = document.getElementById('projects-menu');
    const projectDetails = document.getElementById('project-details');
    const closeBtn = document.getElementById('close-btn');

    // Block 3D clicks if overlay is open or clicking on UI elements
    if (
      projectDetails.classList.contains('active') ||
      projectDetails.contains(e.target) ||
      e.target === closeBtn ||
      closeBtn.contains(e.target) ||
      e.target === projectsBtn ||
      projectsBtn.contains(e.target)
    ) {
      return false;
    }

    mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1;
    mousePosition.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mousePosition, camera);
    intersects = raycaster.intersectObjects(scene.children);
    intersects.forEach((intersect) => {
      if (intersect.object.name === 'project') {
        openProjectDetails(intersect.object.userData.index);
      }

      if (
        intersect.object.name === 'Book' ||
        intersect.object.name === 'Book001'
      ) {
        disableOrbitControls();
        cameraToAbout();
        gsap.delayedCall(1.5, enableCloseBtn);
      }

      if (
        intersect.object.name === 'SwitchBoard' ||
        intersect.object.name === 'Switch'
      ) {
        theme = newTheme;
        switchTheme(theme);
      }
    });
  });

  // Mousemove Logic for Cursor
  window.addEventListener('mousemove', function (e) {
    const projectDetails = document.getElementById('project-details');

    // Don't change cursor if overlay is active (let CSS handle it)
    if (projectDetails.classList.contains('active')) {
      document.body.style.cursor = 'default';
      return;
    }

    mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1;
    mousePosition.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mousePosition, camera);
    intersects = raycaster.intersectObjects(scene.children);

    let isHovering = false;
    intersects.forEach((intersect) => {
      if (
        intersect.object.name === 'project' ||
        intersect.object.name === 'Book' ||
        intersect.object.name === 'Book001' ||
        intersect.object.name === 'SwitchBoard' ||
        intersect.object.name === 'Switch'
      ) {
        isHovering = true;
      }
    });

    if (isHovering) {
      document.body.style.cursor = 'pointer';
    } else {
      document.body.style.cursor = 'default';
    }
  });
}

// RESPONSIVE
function initResponsive(roomScene) {
  if (isMobile) {
    roomScene.scale.set(0.95, 0.95, 0.95);
    aboutCameraPos = {
      x: 0.09,
      y: 0.23,
      z: 0.51,
    };
    aboutCameraRot = {
      x: -1.57,
      y: 0,
      z: 1.57,
    };

    // rect light
    // rectLight.width = 0.406;
    // rectLight.height = 0.3;
    // rectLight.position.z = -0.34;

    // project
    projectsCameraPos = {
      x: 1.1,
      y: 0.82,
      z: 0.5,
    };
    projectsCameraRot = {
      x: 0,
      y: 0,
      z: 1.55,
    };
    projects.forEach((project, i) => {
      project.mesh.position.z = -1.13;
    });

    controls.maxDistance = 1.5;
    controls.maxAzimuthAngle = Math.PI * 0.75;
  }
}

// close button
document.getElementById('close-btn').addEventListener('click', (e) => {
  e.preventDefault();
  resetCamera();
});

// contact menu
document.getElementById('contact-btn').addEventListener('click', (e) => {
  e.preventDefault();
  document
    .querySelector('.contact-menu__dropdown')
    .classList.toggle('contact-menu__dropdown--open');
});

document.addEventListener('mouseup', (e) => {
  const container = document.querySelector('.contact-menu');
  if (!container.contains(e.target)) {
    container
      .querySelector('.contact-menu__dropdown')
      .classList.remove('contact-menu__dropdown--open');
  }
});

// update camera, renderer on resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Project Wall Logic
function openProjectDetails(index) {
  currentProjectIndex = index;
  updateProjectDetailsUI(currentProjectIndex);

  const overlay = document.getElementById('project-details');
  overlay.classList.add('active');

  // Disable orbit controls when wall is open
  disableOrbitControls();
}

function closeProjectDetails() {
  const overlay = document.getElementById('project-details');
  overlay.classList.remove('active');

  // Reset camera view if needed or just re-enable controls
  // For now, we keep the user in the "projects" view (zoomed in)
  // relying on the existing "close-btn" to go back to room view
  // enableOrbitControls(); 
}

function updateProjectDetailsUI(index) {
  const project = projects[index];
  if (!project) return;

  document.getElementById('project-title').textContent = project.title;
  document.getElementById('project-label').textContent = project.label || 'PROJECT';
  document.getElementById('project-short-desc').textContent = project.shortDescription;
  document.getElementById('project-full-desc').textContent = project.fullDescription;
  document.getElementById('project-link').href = project.link;

  // New Field: Experience
  const expElement = document.getElementById('project-experience');
  if (expElement) {
    expElement.textContent = project.myExperience || "Experience details coming soon.";
  }

  // Tech Stack
  const techContainer = document.getElementById('project-tech-stack');
  techContainer.innerHTML = '';
  if (project.techStack) {
    project.techStack.forEach(tech => {
      const span = document.createElement('span');
      span.className = 'tech-tag';
      span.textContent = tech;
      techContainer.appendChild(span);
    });
  }

  // Render Gallery
  renderGallery(project.highlights || []);
}

// Gallery Logic
let currentLightboxIndex = 0;
let currentProjectImages = [];

function renderGallery(images) {
  const galleryGrid = document.getElementById('project-gallery-grid');
  galleryGrid.innerHTML = '';
  currentProjectImages = images;

  // We want a 2x2 grid (4 items). 
  // If fewer images, we can repeat or show placeholders to maintain layout? 
  // For now, let's just show what we have. 
  // Ideally user provides 4 images.

  // Limit to 4 for the box view or show all? 
  // Design said 4 boxes. Let's show up to 4.
  const displayImages = images.slice(0, 4);

  displayImages.forEach((src, idx) => {
    const img = document.createElement('img');
    img.src = src;
    img.className = 'gallery-thumb';
    img.alt = `Highlight ${idx + 1}`;
    img.onclick = () => openLightbox(idx);
    galleryGrid.appendChild(img);
  });
}

// Lightbox Logic
const lightbox = document.getElementById('lightbox-modal');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxClose = document.getElementById('lightbox-close');
const lightboxNext = document.getElementById('lightbox-next');
const lightboxPrev = document.getElementById('lightbox-prev');

function openLightbox(index) {
  if (currentProjectImages.length === 0) return;
  currentLightboxIndex = index;
  updateLightboxImage();
  lightbox.classList.add('active');
}

function closeLightbox() {
  lightbox.classList.remove('active');
}

function updateLightboxImage() {
  lightboxImg.src = currentProjectImages[currentLightboxIndex];
}

function nextLightboxImage() {
  currentLightboxIndex = (currentLightboxIndex + 1) % currentProjectImages.length;
  updateLightboxImage();
}

function prevLightboxImage() {
  currentLightboxIndex = (currentLightboxIndex - 1 + currentProjectImages.length) % currentProjectImages.length;
  updateLightboxImage();
}

// Lightbox Event Listeners
if (lightboxClose) lightboxClose.onclick = closeLightbox;
if (lightboxNext) lightboxNext.onclick = nextLightboxImage;
if (lightboxPrev) lightboxPrev.onclick = prevLightboxImage;

// Close on background click
if (lightbox) {
  lightbox.onclick = (e) => {
    if (e.target === lightbox) closeLightbox();
  };
}


// Navigation Listeners
document.getElementById('close-project-btn').addEventListener('click', closeProjectDetails);

document.getElementById('next-project-btn').addEventListener('click', () => {
  currentProjectIndex = (currentProjectIndex + 1) % projects.length;
  updateProjectDetailsUI(currentProjectIndex);
});

// Reuse close-btn to also close project overlay if open
document.getElementById('close-btn').addEventListener('click', () => {
  closeProjectDetails();
});

// Helper to create dynamic card texture
function createCardTexture(project) {
  const canvas = document.createElement('canvas');
  // Increase resolution by 3x for high-DPI sharpness
  const scale = 3;
  canvas.width = 750 * scale;
  canvas.height = 1300 * scale;
  const ctx = canvas.getContext('2d');
  const radius = 40 * scale;

  // 1. Clip for Rounded Corners
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(canvas.width - radius, 0);
  ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
  ctx.lineTo(canvas.width, canvas.height - radius);
  ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height);
  ctx.lineTo(radius, canvas.height);
  ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.clip();

  // 2. Background (White)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 3. Project Image (Top 75-80%)
  const imgHeight = 1000 * scale;
  const img = new Image();
  img.src = project.thumbnail;
  const texture = new THREE.CanvasTexture(canvas);

  // Improve texture quality settings
  texture.minFilter = THREE.LinearFilter; // Sharpens up close
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy(); // crisp at angles

  img.onload = () => {
    // Draw Image covering top area
    ctx.drawImage(img, 0, 0, canvas.width, imgHeight);

    // 4. Content Area (Bottom - White)

    // 5. Text & UI Elements
    const contentStartY = imgHeight + (60 * scale);
    ctx.textAlign = 'left';

    // Title
    ctx.font = `400 ${65 * scale}px Chewy, Inter, "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = '#6b4c3a';
    ctx.fillText(project.title, 50 * scale, contentStartY);

    // Short Description (Under Title)
    if (project.shortDescription) {
      ctx.font = `400 ${28 * scale}px Inter, Arial, sans-serif`;
      ctx.fillStyle = '#555555'; // Dark grey
      ctx.fillText(project.shortDescription, 50 * scale, contentStartY + (50 * scale));
    }

    // Tags (Pill Shapes) - Supports Array
    if (project.cardTag) {
      // Normalize to array
      const tags = Array.isArray(project.cardTag) ? project.cardTag : [project.cardTag];

      let currentX = 50 * scale;
      const tagY = contentStartY + (85 * scale); // Shifted down for description

      tags.forEach(tag => {
        const tagText = tag.toUpperCase();
        ctx.font = `bold ${24 * scale}px Inter, Arial, sans-serif`;
        const textMetrics = ctx.measureText(tagText);
        const padding = 20 * scale;
        const tagWidth = textMetrics.width + padding * 2;
        const tagHeight = 50 * scale;

        // Draw Pill
        ctx.fillStyle = '#f0f0f0'; // Light grey bg
        ctx.beginPath();
        ctx.roundRect(currentX, tagY, tagWidth, tagHeight, 25 * scale);
        ctx.fill();

        // Draw Text
        ctx.fillStyle = '#333333';
        ctx.fillText(tagText, currentX + padding, tagY + (34 * scale));

        // Update X for next tag
        currentX += tagWidth + (20 * scale);
      });
    }

    // Achievement Symbol (Trophy/Star)
    if (project.hasAchievement) {
      const badgeSize = 80 * scale;
      const badgeX = canvas.width - (50 * scale) - badgeSize;
      const badgeY = contentStartY - (50 * scale); // Align with title

      // Draw Circle Background
      ctx.beginPath();
      ctx.arc(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#FFD700';
      ctx.fill();

      // Draw Star Icon
      ctx.font = `${40 * scale}px Arial`;
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText('★', badgeX + badgeSize / 2, badgeY + badgeSize / 2 + (14 * scale));

      // Reset align
      ctx.textAlign = 'left';
    }

    texture.needsUpdate = true;
  };

  return texture;
}
