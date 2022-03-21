declare global {
  interface Window {
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
  }
}
declare module '!!raw-loader!*' {
  const contents: string
  export = contents;
}
declare module '!!css-loader!*' {
  const contents: string
  export = contents;
}

declare module '*.svg' {
  const src: string;
  export default src;
}
declare module '*.png' {
  const src: string;
  export default src;
}
declare module '*.jpg' {
  const src: string;
  export default src;
}
declare module '*.jpeg' {
  const src: string;
  export default src;
}
declare module '*.glsl' {
  const s: string;
  export default s;
}
declare module '*.mp3' {
  const src: string;
  export default src;
}

declare let __webpack_public_path__: string;