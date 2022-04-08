import './styles/style.scss';

import {
  ACESFilmicToneMapping, AmbientLight, AnimationClip, AnimationMixer, Clock, Color,
  FrontSide, Group, LinearFilter, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  NearestFilter, PCFSoftShadowMap, PerspectiveCamera, PlaneGeometry, PointLight,
  Scene, ShadowMaterial, sRGBEncoding, Texture, TextureLoader, WebGLRenderer
} from 'three';
import {GLTFLoader, GLTF} from 'three/examples/jsm/loaders/GLTFLoader';
import {gsap} from 'gsap';

import ticketTexture from './textures/ticket.png';



const CLASS_NAME = 'webgl-';

enum State {
  'before', // 0 - пустой экран
  'ticket', // 1 - билетик
  'play',   // 2 - футболисты
  'left',   // 3 - футболист слева
  'right',  // 4 - футболист справа
  'after'   // 5 - экран с фоном
}

interface Ticket {
  master: Group;
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
type TicketChangeEvent = {
  groupPositionX: number;
  groupPositionY: number;
  groupPositionZ: number;
  groupRotationZ: number;
  halfRotationX: number;
  opacity: number;
  isVisible: boolean;
}
interface Player {
  mixer?: AnimationMixer;
  animations: AnimationClip[];
  activeAnimation: number;
  time: number;
  group?: Group;
}
type PlayerChangeEvent = {
  groupPositionX: number;
  groupPositionY: number;
  groupPositionZ: number;
  leftPositionX: number;
  rightPositionX: number;
  leftRotationY: number;
  rightRotationY: number;
  leftOpacity: number;
  rightOpacity: number;
  isVisible: boolean;
}
type OnChangeHandler = (state: State) => void;
type OnProgressHandler = (progress: number) => void;



const _updateMixer = (player: Player, delta: number) => {
  const {mixer, animations, activeAnimation} = player;
  if (!mixer) return;

  mixer.update(delta);

  // const time = mixer.time / (animations[activeAnimation].duration * (player.time + 1));
  // if (time >= 1) {
  //   mixer.dispatchEvent({
  //     type: 'finished'
  //   });
  //   player.time ++;
  // }
}

// Хотелось бы запускать анимацию после того, как закончится предыдущая,
// но в трихе все через ж
// const _setClip = (player: Player, isChange: boolean) => {
//   const {mixer, animations, activeAnimation} = player;
//   if (!mixer) return;
//
//   let newAnimation = 0;
//
//   if (isChange) {
//     if (activeAnimation === 0) {
//       newAnimation = 1;
//     } else {
//       newAnimation = 0;
//     }
//   } else {
//     if (activeAnimation === 0) return;
//   }
//   console.log(isChange)
//   player.activeAnimation = newAnimation;
//   player.time = 0;
//   mixer.stopAllAction();
//   const action = mixer.clipAction(animations[newAnimation]);
//   action.play();
// }

const _setClip = (player: Player, clip: number) => {
  const {mixer, animations, activeAnimation} = player;
  if (!mixer || activeAnimation === clip) return;

  player.activeAnimation = clip;
  mixer.stopAllAction();
  const action = mixer.clipAction(animations[clip]);
  action.play();
}

export class WebGL {
  private _isLoaded: boolean;
  private _isActive: boolean;
  private _state: State;
  private _width: number;
  private _height: number;
  private _raf: number;
  private readonly _delay: number;

  private _timer?: ReturnType<typeof setTimeout>;

  private readonly _container: HTMLElement;
  private readonly _wrapper: HTMLDivElement;
  private readonly _clock: Clock;
  private readonly _renderer: WebGLRenderer;
  private readonly _scene: Scene;
  private readonly _camera: PerspectiveCamera;

  private readonly _ticket: Ticket;
  private readonly _players: {
    master: Group;
    shadow: ShadowMaterial;
    left: Player;
    right: Player;
  };

  private _onChange: OnChangeHandler;
  private _onProgress: OnProgressHandler;
  private readonly onResize: () => void;
  private readonly tick: () => void;

  constructor(container: HTMLElement, retina?: boolean) {
    this._isLoaded = false;
    this._isActive = false;
    this._state = 0;
    this._width = 1;
    this._height = 1;
    this._raf = -1;
    this._delay = 0.2;

    this._container = container;
    this._wrapper = this._createWrapper();
    this._createBG();

    this._clock = new Clock();
    this._renderer = this._createRenderer(retina);
    this._scene = new Scene();
    this._camera = new PerspectiveCamera(45, 1, 0.01, 1000);

    this._ticket = {
      master: new Group(),
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
    this._players = {
      master: new Group(),
      shadow: new ShadowMaterial(),
      left: {
        animations: [],
        activeAnimation: 0,
        time: 0
      },
      right: {
        animations: [],
        activeAnimation: 0,
        time: 0
      }
    };

    const light = new AmbientLight('#FFFFFF', 0.6);
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

    _updateMixer(this._players.left, delta);
    _updateMixer(this._players.right, delta);

    this._renderer.render(this._scene, this._camera);

    this._raf = requestAnimationFrame(this.tick);
  }
  public start() {
    if (this._isActive) return;
    this._raf = requestAnimationFrame(this.tick);
    this._isActive = true;
  }
  public stop() {
    if (!this._isActive) return;
    cancelAnimationFrame(this._raf);
    this._isActive = false;
  }

  private _createRenderer(retina?: boolean) {
    const renderer = new WebGLRenderer({
      alpha: true,
      antialias: true,
      logarithmicDepthBuffer: true // if textures blinking
    });

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;

    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputEncoding = sRGBEncoding;

    if (retina) renderer.setPixelRatio(window.devicePixelRatio || 1);

    this._wrapper.appendChild(renderer.domElement);

    return renderer;
  }

  private _createWrapper() {
    const wrapper = document.createElement('div');
    wrapper.classList.add(`${CLASS_NAME}wrapper`);
    this._container.appendChild(wrapper);
    return wrapper;
  }
  private _createBG() {
    const bg = document.createElement('div');
    bg.classList.add(`${CLASS_NAME}bg`);

    const inner = document.createElement('div');
    inner.classList.add(`${CLASS_NAME}bg-inner`);

    for (let i = 0; 12 > i; i++) {
      inner.appendChild(document.createElement('span'));
    }

    bg.appendChild(inner);
    this._wrapper.appendChild(bg);
    return bg;
  }

  private _createTicket(texture: Texture) {
    texture.encoding = sRGBEncoding;
    const {master, group, top, bottom} = this._ticket;

    const light = new PointLight(0xffffff, 1.3, 25);
    // light.castShadow = true;
    // light.shadow.mapSize.width = 512;
    // light.shadow.mapSize.height = 512;
    // light.shadow.camera.near = 1;
    // light.shadow.camera.far = 2000;
    light.position.set(1, -10, 1);

    const scale = 7.1;
    const width = 1 / scale;
    // соотношение ширины всего билета к высоте половинки / scale
    const height = 1495/2/912 / scale;
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
      mesh.castShadow = true;
      mesh.receiveShadow = true;
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

    // test
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
    master.add(group, light);
    this._scene.add(master);
  }
  private _changeTicket({groupPositionX,
                          groupPositionY,
                          groupPositionZ,
                          groupRotationZ,
                          halfRotationX,
                          opacity,
                          isVisible}: TicketChangeEvent,
                        onComplete?: () => void,
                        onCompleteAnimation?: () => void) {
    const {master, group, top, bottom} = this._ticket;

    const vars = {
      duration: isVisible ? 1 : 0.5,
      delay: 0,
      ease: isVisible ? 'power2.out' : undefined,
      overwrite: true
    }

    master.visible = master.visible || isVisible;

    if (onCompleteAnimation) {
      if (this._timer) clearTimeout(this._timer);
      this._timer = setTimeout(() => onCompleteAnimation(),
        (vars.duration - this._delay) * 1000);
    }

    gsap.to(group.rotation, {
      ...vars,
      z: groupRotationZ,
      onComplete: () => {
        master.visible = isVisible;
        if (onComplete) onComplete();
      }
    });
    gsap.to(group.position, {
      ...vars,
      y: groupPositionY,
      x: groupPositionX,
      z: groupPositionZ
    });

    gsap.to(top.group.rotation, {
      ...vars,
      x: halfRotationX
    });
    gsap.to(top.material, {
      ...vars,
      opacity
    });

    gsap.to(bottom.group.rotation, {
      ...vars,
      x: -halfRotationX
    });
    gsap.to(bottom.material, {
      ...vars,
      opacity
    });
  }


  private _createPlayer(leftGLTF: GLTF, rightGLTF: GLTF) {
    const {master, shadow, left, right} = this._players;

    const mixerLeft = new AnimationMixer(leftGLTF.scene);

    const actionLeft = mixerLeft.clipAction(leftGLTF.animations[left.activeAnimation]);
    // mixerLeft.addEventListener('finished', () => _setClip(this._players.left, this._state === 3));
    this._players.left.mixer = mixerLeft;
    this._players.left.animations = leftGLTF.animations;
    actionLeft.play();
    mixerLeft.setTime(leftGLTF.animations[0].duration / 3);

    const mixerRight = new AnimationMixer(rightGLTF.scene);
    const actionRight = mixerRight.clipAction(rightGLTF.animations[right.activeAnimation]);
    // mixerLeft.addEventListener('finished', () => _setClip(this._players.right, this._state === 4));
    this._players.right.mixer = mixerRight;
    this._players.right.animations = rightGLTF.animations;
    actionRight.play();

    // const props = ['map'] as const;

    const traverse = (group: Group) => {
      group.traverse((object) => {
        if ('isMesh' in object) {
          const obj = object as Mesh;

          const basic = obj.material as MeshBasicMaterial;
          basic.transparent = true;
          basic.opacity = 0;
          basic.side = FrontSide;

          // костыль:
          // какие модели - такая реализация
          if (obj.name === 'Skin_02003') obj.frustumCulled = false;

          // const params: MeshStandardMaterialParameters = {};
          //
          // props.forEach((prop) => {
          //   params[prop] = basic[prop];
          // })
          //
          // const standard = new MeshStandardMaterial(params);
          // console.log(standard)

          // падающая тень от персов
          // obj.castShadow = true;
          // вот из-за этого были артефакты на груди
          // obj.receiveShadow = true;
        }
      })
    }

    const {scene: leftGroup} = leftGLTF;
    const {scene: rightGroup} = rightGLTF;
    left.group = leftGroup;
    right.group = rightGroup;

    traverse(leftGroup);
    leftGroup.scale.setScalar(8);
    leftGroup.position.x = -12;
    leftGroup.position.z = -4;
    leftGroup.position.y = -0.5;
    leftGroup.rotation.y = -Math.PI / 5;

    traverse(rightGroup);
    rightGroup.scale.setScalar(8.3);
    rightGroup.position.x = 12;
    rightGroup.rotation.y = Math.PI / 5;


    // master.visible = false;
    master.position.y = -46;
    master.position.z = -500;


    // падающая тень от персов
    // const geometry = new PlaneGeometry(150, 150);
    // geometry.rotateX(-Math.PI / 2);
    // shadow.opacity = 0;
    // const mesh = new Mesh(geometry, shadow);
    // mesh.receiveShadow = true;
    // const shadowLight = new PointLight(0xFFFFFF, 0.5);
    // shadowLight.castShadow = true;
    // shadowLight.position.set(0, 1500, 100);
    // shadowLight.shadow.mapSize.width = 4024;
    // shadowLight.shadow.mapSize.height = 4024;
    // shadowLight.shadow.camera.near = 1;
    // shadowLight.shadow.camera.far = 2000;
    // shadowLight.shadow.bias = -0.000222;

    // const light = new PointLight(0xFFFFFF, 0.9, 350);
    // light.position.set(0, 15, 10);
    // light.castShadow = true;
    // const lightLeft = new PointLight(0xFFFFFF, 0, 150);
    // // lightLeft.castShadow = true;
    // lightLeft.position.set(-120, 0, 0);
    // const lightRight = new PointLight(0xFFFFFF, 0, 150);
    // // lightRight.castShadow = true;
    // lightRight.position.set(130, 10, 0);


    master.add(leftGroup, rightGroup);
    // group.add(leftGroup, rightGroup, mesh, shadowLight, light, lightLeft, lightRight);
    // group.add(left, mesh, light2);
    this._scene.add(master);
  }
  private _changePlayers({groupPositionX,
                           groupPositionY,
                           groupPositionZ,
                           leftPositionX,
                           rightPositionX,
                           leftRotationY,
                           rightRotationY,
                           leftOpacity,
                           rightOpacity,
                           isVisible}: PlayerChangeEvent,
                         onComplete?: () => void,
                         onCompleteAnimation?: () => void) {
    const {master, shadow, left, right} = this._players;

    const vars = {
      duration: isVisible ? 0.8 : 0.4,
      delay: 0,
      ease: 'power2.out',
      overwrite: true
    }

    master.visible = master.visible || isVisible;

    if (onCompleteAnimation) {
      if (this._timer) clearTimeout(this._timer);
      this._timer = setTimeout(() => onCompleteAnimation(),
        (vars.duration - this._delay) * 1000);
    }

    gsap.to(master.position, {
      ...vars,
      x: groupPositionX,
      y: groupPositionY,
      z: groupPositionZ,
      onComplete: () => {
        master.visible = isVisible;
        if (onComplete) onComplete();
      }
    });

    gsap.to(shadow, {
      ...vars,
      opacity: leftOpacity + rightOpacity > 0 ? 0.1 : 0
    });

    gsap.to(left.group!.rotation, {
      ...vars,
      y: leftRotationY
    });
    gsap.to(left.group!.position, {
      ...vars,
      x: leftPositionX
    });
    left.group!.traverse((object) => {
      if ('isMesh' in object) {
        const obj = object as Mesh;
        const basic = obj.material as MeshBasicMaterial;

        gsap.to(basic, {
          opacity: leftOpacity
        })
      }
    });

    gsap.to(right.group!.rotation, {
      ...vars,
      y: rightRotationY
    });
    gsap.to(right.group!.position, {
      ...vars,
      x: rightPositionX
    });
    right.group!.traverse((object) => {
      if ('isMesh' in object) {
        const obj = object as Mesh;
        const basic = obj.material as MeshBasicMaterial;

        gsap.to(basic, {
          opacity: rightOpacity
        })
      }
    });
  }


  public async load() {
    if (this._isLoaded) return;

    const textureLoader = new TextureLoader();
    const textureTicketPromise = new Promise<Texture>((resolve, reject) => {
      textureLoader.load(ticketTexture, resolve, () => {}, reject);
    });

    const modelLoader = new GLTFLoader();
    modelLoader.setPath('./models/')
    const leftPlayerPromise = modelLoader.loadAsync('woman_anim_5.gltf');
    const rightPlayerPromise = modelLoader.loadAsync('man_anim_5.gltf');

    // await Promise.all([textureTicketPromise, leftPlayerPromise]);
    const ticket = await textureTicketPromise;
    this._createTicket(ticket);

    const left = await leftPlayerPromise;
    const right = await rightPlayerPromise;

    this._createPlayer(left, right);

    this._onResize();
    this._renderer.render(this._scene, this._camera);

    this._isLoaded = true;
  }
  public set onChange(func: OnChangeHandler | null) {
    this._onChange = func ? func : () => {};
  }
  // TODO: если понадобится - допишу
  // public set onProgress(func: (progress: number) => void) {
  //   this._onProgress = func;
  // }
  public get state() {
    return this._state;
  }
  public set state(state: State) {
    if (!this._isLoaded || state === this._state) return;

    // защита от дурака(без негатива, конечно)
    state = Math.round(state) as State;
    state = Math.max(state, 0) as State;
    state = Math.min(state, 5) as State;

    const defaultTicketEvent: TicketChangeEvent = {
      groupPositionX: 0,
      groupPositionY: 0,
      groupPositionZ: 0.5,
      groupRotationZ: 0,
      halfRotationX: 0,
      opacity: 0,
      isVisible: false
    }
    const defaultPlayersEvent: PlayerChangeEvent = {
      groupPositionX: 0,
      groupPositionY: -46,
      groupPositionZ: -500,
      leftPositionX: -12,
      rightPositionX: 12,
      leftRotationY: -Math.PI / 3,
      rightRotationY: Math.PI / 3,
      leftOpacity: 0,
      rightOpacity: 0,
      isVisible: false
    }


    switch (state) {
      case 0: {
        this.start();
        this._changeTicket(
          {
            ...defaultTicketEvent,
            groupRotationZ: -0.4,
            groupPositionZ: -3,
            halfRotationX: Math.PI / 2
          },
          () => this.stop(),
          () => this._onChange(0));
        this._changePlayers({
          ...defaultPlayersEvent
        })
        break;
      }
      case 1: {
        this.start();
        this._changeTicket(
          {
            ...defaultTicketEvent,
            groupPositionX: 0.005,
            groupPositionY: 0.124,
            groupPositionZ: -1,
            groupRotationZ: -0.14,
            // halfRotationX: 0,
            opacity: 1,
            isVisible: true
          },
          () => {},
          () => this._onChange(1));
        this._changePlayers({
          ...defaultPlayersEvent
        })
        break;
      }
      case 2: {
        this.start();
        this._changeTicket(defaultTicketEvent);
        this._changePlayers({
          ...defaultPlayersEvent,
          groupPositionX: 0,
          groupPositionZ: -200,
          leftRotationY: -Math.PI / 14,
          rightRotationY: Math.PI / 16,
          rightOpacity: 1,
          leftOpacity: 1,
          isVisible: true
        },
          () => {},
          () => {
            this._onChange(2);

            _setClip(this._players.left, 0);
            _setClip(this._players.right, 0);
          });
        break;
      }
      case 3: {
        this.start();
        this._changeTicket(defaultTicketEvent);
        this._changePlayers({
          ...defaultPlayersEvent,
            groupPositionX: 0,
            groupPositionY: -51.5,
            groupPositionZ: -79,
            leftPositionX: 0,
            rightPositionX: 35,
            leftRotationY: 0,
            rightOpacity: 1,
            leftOpacity: 1,
            isVisible: true
        },
          () => {},
          () => {
            this._onChange(3);
            _setClip(this._players.left, 1);
            _setClip(this._players.right, 0);
          });
        break;
      }
      case 4: {
        this.start();
        this._changeTicket(defaultTicketEvent);
        this._changePlayers({
          ...defaultPlayersEvent,
            groupPositionX: 0,
            groupPositionY: -54,
            groupPositionZ: -87,
            leftPositionX: -35,
            rightPositionX: 0,
            rightRotationY: 0,
            rightOpacity: 1,
            leftOpacity: 1,
            isVisible: true
        },
          () => {},
          () => {
            this._onChange(4);
            _setClip(this._players.left, 0);
            _setClip(this._players.right, 1);
          });
        break;
      }
      case 5: {
        this.start();
        this._changeTicket(defaultTicketEvent);
        this._changePlayers({
          ...defaultPlayersEvent,
          ...(this._state === 3 ?
            {
              groupPositionX: -20,
              groupPositionY: -51.5,
              groupPositionZ: -79,
              rightPositionX: 55,
              rightRotationY: Math.PI / 16
            } : {
              groupPositionX: -45,
              groupPositionY: -54,
              groupPositionZ: -87,
              rightPositionX: 12,
              rightRotationY: -Math.PI / 3
            }
          ),
            // groupPositionX: -35,
            // groupPositionY: -54,
            // groupPositionZ: -87,
            // leftPositionX: -28,
            rightOpacity: 1,
            leftOpacity: 1,
            isVisible: true
        },
          () => this.stop(),
          () => this._onChange(5));
        break;
      }
    }

    this._wrapper.className = `${CLASS_NAME}wrapper step-${state}`;

    this._state = state;
  }
  public destroy() {
    this._container.removeChild(this._wrapper);
    window.removeEventListener('resize', this.onResize);
    this.stop();
  }
}