// telegram.js — всё, что связано с Telegram Mini App, собрано в одном месте.
// Остальной код не обращается к Telegram напрямую, а вызывает функции отсюда.
// Поэтому, если Telegram нет, достаточно проверить это один раз в этом файле.

// Официальный скрипт telegram-web-app.js создаёт объект window.Telegram.WebApp.
// Знак ?. означает: если слева undefined, вернуть undefined и не выбрасывать ошибку.
// Это нужно, если скрипт не загрузился (например, нет интернета).
const webApp = window.Telegram?.WebApp;

// Скрипт Telegram создаёт объект WebApp даже в обычном браузере, поэтому
// одной проверки на существование объекта мало. Внутри Telegram поле initData
// содержит данные о запуске (пользователь, подпись), а в браузере это пустая строка.
export const isTelegram = Boolean(webApp && webApp.initData);

// Соответствие между цветами темы Telegram и CSS-переменными нашего style.css.
// Слева — имя поля в webApp.themeParams, справа — имя CSS-переменной.
const THEME_TO_CSS = {
  bg_color: '--color-bg',
  secondary_bg_color: '--color-surface',
  text_color: '--color-text',
  hint_color: '--color-muted',
  button_color: '--color-accent',
  button_text_color: '--color-accent-text',
};

// Переносит цвета из темы пользователя Telegram в CSS-переменные страницы.
function applyTheme() {
  const theme = webApp.themeParams;
  const rootStyle = document.documentElement.style;

  for (const [themeKey, cssVariable] of Object.entries(THEME_TO_CSS)) {
    // Старые версии Telegram передают не все цвета. Если цвета нет,
    // оставляем значение из style.css, а не записываем пустоту.
    if (theme[themeKey]) {
      // Стиль, записанный прямо в элемент <html>, важнее правил из style.css.
      // Поэтому цвета Telegram заменяют наши цвета светлой и тёмной темы.
      rootStyle.setProperty(cssVariable, theme[themeKey]);
    }
  }

  // Отмечаем тему атрибутом, чтобы CSS мог подстроить детали
  // (например, тени), которые не приходят из Telegram.
  document.documentElement.dataset.theme = webApp.colorScheme; // 'light' или 'dark'
}

// Готовит Mini App к работе. В обычном браузере ничего не делает.
export function initTelegram() {
  if (!isTelegram) {
    return;
  }

  // ready() сообщает Telegram, что страница загрузилась.
  // До этого вызова Telegram показывает заставку загрузки.
  webApp.ready();

  // expand() раскрывает Mini App на всю высоту экрана. Иначе окно может
  // открыться наполовину, и карта не поместится.
  webApp.expand();

  // Когда пользователь прокручивает длинный текст на обороте карты,
  // свайп вниз может свернуть Mini App. Начиная с версии 7.7 это можно отключить.
  // isVersionAtLeast проверяет версию, чтобы не вызвать функцию,
  // которой в старом Telegram нет.
  if (webApp.isVersionAtLeast('7.7')) {
    webApp.disableVerticalSwipes();
  }

  applyTheme();

  // Пользователь может сменить тему, пока Mini App открыт.
  // Telegram сообщает об этом событием themeChanged, и мы перекрашиваем страницу.
  webApp.onEvent('themeChanged', applyTheme);
}

// Короткая лёгкая вибрация. Вызывается при вытягивании и перевороте карты.
export function vibrate() {
  // HapticFeedback появился в версии 6.1. В браузере и старом Telegram
  // просто ничего не делаем.
  if (isTelegram && webApp.isVersionAtLeast('6.1')) {
    webApp.HapticFeedback.impactOccurred('light');
  }
}
