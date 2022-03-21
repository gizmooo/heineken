import 'core-js/stable';
import 'regenerator-runtime/runtime';

// libraries



// utilities
import {WebGL} from './webgl';
const container = document.querySelector<HTMLDivElement>('.container');
if (container) {
  const webgl = new WebGL(container);
  webgl.load().then(() => {
    console.log('Загружено и готово к использованию')
    webgl.state = 1;
    setTimeout(() => {
      webgl.state = 2;

      setTimeout(() => {
        webgl.state = 3;
      }, 2000)
    }, 2000)
  }).catch((e) => console.log(e));
}


// import GlobalStore from './store/store';
// console.log(GlobalStore)

// components


// module
