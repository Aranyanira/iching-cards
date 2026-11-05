// app.js — связывает логику колоды (deck.js) с HTML-страницей.
// Здесь находим элементы, обрабатываем нажатия кнопок и выводим текст.

import { loadDeck, pickRandomCard, splitText } from './deck.js';
import { initTelegram, vibrate } from './telegram.js';

// Находим все нужные элементы один раз при запуске, а не при каждом нажатии.
const startScreen = document.getElementById('start-screen');
const cardScreen = document.getElementById('card-screen');
const statusMessage = document.getElementById('status-message');

const card = document.getElementById('card');
const cardFront = document.getElementById('card-front');
const cardBack = document.getElementById('card-back');
const cardImage = document.getElementById('card-image');
const cardTitle = document.getElementById('card-title');
const cardQuote = document.getElementById('card-quote');
const cardBackTitle = document.getElementById('card-back-title');
const cardText = document.getElementById('card-text');

const drawButton = document.getElementById('draw-button');
const readButton = document.getElementById('read-button');
const backButton = document.getElementById('back-button');
const newQuestionButton = document.getElementById('new-question-button');

// Состояние приложения: загруженная колода и id последней выпавшей карты.
// let, а не const, потому что значения меняются во время работы.
let deck = [];
let lastCardId = null;

// Показывает один экран и скрывает другой.
function showScreen(screen) {
  startScreen.hidden = screen !== startScreen;
  cardScreen.hidden = screen !== cardScreen;
  // Новый экран может оказаться ниже края окна, поэтому прокручиваем наверх.
  window.scrollTo(0, 0);
}

// Поворачивает карту лицом (flipped = false) или оборотом (flipped = true).
function setFlipped(flipped) {
  // Класс is-flipped в style.css запускает анимацию поворота.
  card.classList.toggle('is-flipped', flipped);

  // inert делает сторону недоступной для нажатий и клавиши Tab.
  // Без этого можно было бы случайно нажать невидимую кнопку
  // на стороне, которая сейчас повёрнута от нас.
  cardFront.inert = flipped;
  cardBack.inert = !flipped;
}

// Заполняет обратную сторону карты абзацами толкования.
function renderText(text) {
  // replaceChildren() без аргументов удаляет всё старое содержимое,
  // иначе абзацы прошлой карты остались бы на месте.
  cardText.replaceChildren();

  for (const block of splitText(text)) {
    // Для подзаголовка создаём <h3>, для обычного абзаца <p>.
    const element = document.createElement(block.type === 'heading' ? 'h3' : 'p');
    // textContent вставляет текст как обычный текст. Если в JSON окажутся
    // символы вроде <script>, браузер покажет их как буквы и не выполнит как код.
    // innerHTML разобрал бы их как HTML, поэтому его здесь не используем.
    element.textContent = block.text;
    cardText.append(element);
  }

  // Каждая новая карта начинает читаться с начала, а не с места,
  // где остановилась прокрутка у прошлой карты.
  cardText.scrollTop = 0;
}

// Заполняет обе стороны карты данными выбранной карты.
async function renderCard(chosenCard) {
  cardTitle.textContent = chosenCard.title;
  cardQuote.textContent = chosenCard.quote;
  cardBackTitle.textContent = chosenCard.title;
  cardImage.alt = chosenCard.title;
  renderText(chosenCard.text);

  cardImage.src = chosenCard.image;
  // decode() ждёт, пока картинка загрузится и будет готова к показу.
  // Так карта не появится на экране с пустым местом вместо картинки.
  // catch нужен, чтобы ошибка загрузки картинки не сломала показ текста.
  await cardImage.decode().catch(() => {});
}

// Обработчик кнопки «Взять карту».
async function handleDraw() {
  const chosenCard = pickRandomCard(deck, lastCardId);
  lastCardId = chosenCard.id;

  // Пока грузится картинка, блокируем кнопку, чтобы повторное
  // нажатие не запустило второе вытягивание.
  drawButton.disabled = true;
  vibrate();

  await renderCard(chosenCard);

  // Карта всегда появляется лицевой стороной.
  setFlipped(false);
  showScreen(cardScreen);
  drawButton.disabled = false;
}

// Подключаем обработчики к кнопкам.
drawButton.addEventListener('click', handleDraw);

readButton.addEventListener('click', () => {
  vibrate();
  setFlipped(true);
});

backButton.addEventListener('click', () => {
  vibrate();
  setFlipped(false);
});

newQuestionButton.addEventListener('click', () => {
  setFlipped(false);
  showScreen(startScreen);
});

// Запуск приложения.
async function start() {
  initTelegram();

  try {
    // Путь относительный: файл ищется рядом с index.html.
    // Так страница работает и локально, и на GitHub Pages в подпапке.
    deck = await loadDeck('cards.json');
    // Кнопка в HTML изначально выключена: тянуть карту из ещё
    // не загруженной колоды нельзя. Включаем её только сейчас.
    drawButton.disabled = false;
  } catch (error) {
    // Показываем понятное сообщение на странице, а подробности
    // пишем в консоль разработчика для поиска причины.
    console.error(error);
    statusMessage.textContent = 'Не удалось загрузить колоду. Обновите страницу.';
    statusMessage.hidden = false;
  }
}

start();
