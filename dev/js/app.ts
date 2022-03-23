import 'core-js/stable';
import 'regenerator-runtime/runtime';

// libraries



// utilities
import {WebGL} from './webgl';
const container = document.querySelector<HTMLDivElement>('.container');
if (container) {
  // создание инстанса всея анимации
  const webgl = new WebGL(container);


  const buttons = document.createElement('div');
  buttons.classList.add('buttons');
  const status = document.createElement('div');
  status.classList.add('status');
  buttons.appendChild(status);

  // загрузка моделей и текстур, лучше это сделать в самом начале
  webgl.load().then(() => {
    console.log('Загружено и готово к использованию');


    ['before', 'ticket', 'play', 'left', 'right', 'after'].forEach((name, index) => {
      const button = document.createElement('button');
      button.innerText = name;
      button.addEventListener('click', () => {
        status.innerText = '';
        // изменение анимаций
        webgl.state = index;
      });
      buttons.appendChild(button)
    })

    container.appendChild(buttons);

    const statuses = [
      'начальный экран',
      'экран с билетом',
      'экран с футболистами',
      'экран с футболистом слева',
      'экран с футболистом справа',
      'экран с фоном'
    ]

    // подписка на onChange для показа текстовых блоков
    // (отрабатывает на 0.2s раньше конца анимаций для красоты)
    // можно поменять в 'private readonly _delay: number;'
    webgl.onChange = (state) => {
      status.innerText = `Отработал: ${statuses[state]}. Можно показывать текст`;
    }

  }).catch((e) => console.log(e));

  // ну и убить все связанное с этой анимацией
  // webgl.destroy() - destroy
}


// import GlobalStore from './store/store';
// console.log(GlobalStore)

// components


// module
