import './styles/style.scss';

import {
  AmbientLight, AnimationMixer, Clock, Color,
  Group, LinearFilter, Mesh, MeshBasicMaterial, MeshPhongMaterial,
  MeshStandardMaterial, NearestFilter,
  PerspectiveCamera,
  PlaneGeometry, PointLight,
  Scene,
  Texture,
  TextureLoader,
  WebGLRenderer
} from 'three';
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader.js';
import {gsap} from 'gsap';
import ticketTexture from './textures/ticket.png';

const className = 'webgl-';

// type State = 'before' | 'ticket' | 'player-left' | 'player-right' | 'after';
type State = number;
// 0 - пустой экран
// 1 - билетик
// 2 - футболисты
// 3 - футболист слева
// 4 - футболист справа
// 5 - экран с фоном


export class WebGL {
  private _isLoaded: boolean;
  private _state: State;
  private _width: number;
  private _height: number;
  private _raf: number;

  private readonly _container: HTMLElement;
  private readonly _wrapper: HTMLDivElement;
  private readonly _clock: Clock;
  private readonly _renderer: WebGLRenderer;
  private readonly _scene: Scene;
  private readonly _camera: PerspectiveCamera;

  private readonly _ticket: {
    group: Group;
    top: {
      group: Group;
      material: MeshStandardMaterial;
    };
    bottom: {
      group: Group;
      material: MeshStandardMaterial;
    };
  }
  private _playerLeft: {
    mixer?: AnimationMixer;
  }

  private _onChange: (state: State) => void;
  private _onProgress: (progress: number) => void;
  private readonly onResize: () => void;
  private readonly tick: () => void;

  constructor(container: HTMLElement) {
    this._isLoaded = false;
    this._state = 0;
    this._width = 1;
    this._height = 1;
    this._raf = -1;

    this._container = container;
    this._wrapper = this._createWrapper();
    this._createBG();

    this._clock = new Clock();
    this._renderer = this._createRenderer();
    this._scene = new Scene();
    this._camera = new PerspectiveCamera(45, 1, 0.01, 200000);

    this._ticket = {
      group: new Group(),
      top: {
        group: new Group(),
        material: new MeshStandardMaterial()
      },
      bottom: {
        group: new Group(),
        material: new MeshStandardMaterial()
      }
    }
    this._playerLeft = {};

    const light = new AmbientLight(0x404040);
    this._scene.add(light);

    this._onChange = () => {};
    this._onProgress = () => {};
    this.onResize = () => this._onResize();
    this.tick = () => this._tick();

    this._onResize();
    window.addEventListener('resize', this.onResize);
  }

  private _onResize() {
    const {width, height} = this._wrapper.getBoundingClientRect();

    this._renderer.setSize(width, height);
    this._camera.aspect = width / height;
    this._camera.updateProjectionMatrix();
  }

  private _tick() {
    const delta = this._clock.getDelta();

    if (this._playerLeft.mixer) this._playerLeft.mixer.update(delta);

    this._renderer.render(this._scene, this._camera);

    this._raf = requestAnimationFrame(this.tick);
  }

  private _createRenderer() {
    const renderer = new WebGLRenderer({
      alpha: true,
      antialias: true,
      // logarithmicDepthBuffer: true // if textures blinking
    });

    renderer.shadowMap.enabled = false;
    renderer.setPixelRatio(window.devicePixelRatio || 1);

    this._wrapper.appendChild(renderer.domElement);

    return renderer;
  }

  private _createWrapper() {
    const wrapper = document.createElement('div');
    wrapper.classList.add(`${className}wrapper`);
    this._container.appendChild(wrapper);
    return wrapper;
  }
  private _createBG() {
    const bg = document.createElement('div');
    bg.classList.add(`${className}bg`);

    const inner = document.createElement('div');
    inner.classList.add(`${className}bg-inner`);

    for (let i = 0; 12 > i; i++) {
      inner.appendChild(document.createElement('span'));
    }

    bg.appendChild(inner);
    this._wrapper.appendChild(bg);
    return bg;
  }

  private _createTicket(texture: Texture) {
    const {group, top, bottom} = this._ticket;

    const light = new PointLight(0xffffff, 1, 15);
    light.position.set(1, 1, 1);

    const width = 1 / 5.9;
    const height = 1495/2/912 / 5.9;
    const geometry = new PlaneGeometry(width, height);

    texture.repeat.set(1, 0.5);
    texture.offset.set(0, 0.5);
    texture.anisotropy = 8;
    texture.minFilter = NearestFilter;
    texture.magFilter = LinearFilter;

    const createHalfTicket = (obj: {group: Group; material: MeshStandardMaterial;}, map: Texture, y: number) => {
      obj.material.transparent = true;
      obj.material.map = map;
      obj.material.opacity = 0;
      obj.material.color = new Color('#FFF');
      const mesh = new Mesh(geometry, obj.material);
      mesh.position.y = y;
      obj.group.add(mesh);
    }

    createHalfTicket(top, texture, height / 2);

    const texture2 = texture.clone();
    texture2.offset.set(0, 0);
    createHalfTicket(bottom, texture2, -height / 2);

    // default positions
    top.group.rotation.x = Math.PI / 2;
    bottom.group.rotation.x = -Math.PI / 2;
    group.rotation.z = 0.4;
    group.position.y = 0;
    group.position.x = 0;
    group.position.z = -3;
    // fov = 60
    // group.rotation.z = -0.14;
    // group.position.y = 0.14;
    // group.position.x = 0.01;
    // group.position.z = -1;
    // fov = 45
    // group.rotation.z = -0.14;
    // group.position.y = 0.077;
    // group.position.x = 0.005;
    // group.position.z = -1;

    group.add(top.group, bottom.group);
    this._scene.add(group, light);
  }
  private _changeTicket(rz: number, py: number, px: number, pz: number, rx: number, opacity: number) {
    const {group, top, bottom} = this._ticket;

    let duration = 1;
    let delay = 0;
    let ease;

    gsap.to(group.rotation, {
      z: rz,
      duration, delay, ease
    });
    gsap.to(group.position, {
      y: py,
      x: px,
      z: pz,
      duration, delay, ease
    });

    gsap.to(top.group.rotation, {
      x: rx,
      duration, delay, ease
    });
    gsap.to(top.material, {
      opacity,
      duration, delay, ease
    });

    gsap.to(bottom.group.rotation, {
      x: -rx,
      duration, delay, ease
    });
    gsap.to(bottom.material, {
      opacity,
      duration, delay, ease
    });
  }


  private _createPlayer(object: Group) {
    console.log(object)

    const mixer = new AnimationMixer(object);

    const action = mixer.clipAction(object.animations[0]);

    this._playerLeft.mixer = mixer;
    action.play();

    object.traverse((child) => {

      if ('isMesh' in child) {
        const ch = child as Mesh;
        if (Array.isArray(ch.material)) {
          (ch.material as MeshPhongMaterial[]).forEach((m) => m.color = new Color(0xFFFFFF))
        }
        ch.castShadow = true;
        ch.receiveShadow = true;
      }

    });
    const group = new Group();
    group.scale.setScalar(0.1)
    group.position.y = -50;
    group.position.z = -200
    group.add(object)
    // object.position.z = -1000;
    // object.position.x = -300;
    // object.rotation.y = 1

    this._scene.add(group);

  }


  public async load() {
    if (this._isLoaded) return;

    const textureLoader = new TextureLoader();
    const texturePromise =  new Promise<Texture>((resolve, reject) => {
      textureLoader.load(ticketTexture, (texture) => {
        this._createTicket(texture);
        resolve(texture);
      }, () => {}, reject);
    });

    const fbxLoader = new FBXLoader();
    const leftPlayerPromise =  new Promise<Group>((resolve, reject) => {
      fbxLoader.load( './models/Player_Animation_all_07_prev.fbx', (object: Group) => {
        this._createPlayer(object);
        resolve(object);
      }, () => {}, reject);
    });

    await Promise.all([texturePromise, leftPlayerPromise]);

    this._onResize();
    this._tick();

    this._isLoaded = true;
  }
  public set onChange(func: (state: State) => void) {
    this._onChange = func;
  }
  // TODO: если понадобится - допишу
  // public set onProgress(func: (progress: number) => void) {
  //   this._onProgress = func;
  // }
  public set state(state: State) {
    if (state === this._state) return;

    state = Math.round(state);
    state = Math.max(state, 0);
    state = Math.min(state, 5);


    switch (state) {
      case 0: {
        this._changeTicket(-0.4, 0, 0, -3, Math.PI / 2, 0);
        break;
      }
      case 1: {
        this._changeTicket(-0.14, 0.077, 0.005, -1, 0, 1);
        break;
      }
      case 2: {
        this._changeTicket(0, 0, 0, 0.5, 0, 0);
        break;
      }
      case 3: {
        this._changeTicket(0, 0, 0, 0.5, 0, 0);
        break;
      }
      case 4: {
        this._changeTicket(0, 0, 0, 0.5, 0, 0);
        break;
      }
      case 5: {
        this._changeTicket(0, 0, 0, 0.5, 0, 0);
        break;
      }
    }

    this._wrapper.className = `${className}wrapper step-${state}`;

    this._state = state;
  }
  public destroy() {
    window.removeEventListener('resize', this.onResize);
    cancelAnimationFrame(this._raf);
  }
}