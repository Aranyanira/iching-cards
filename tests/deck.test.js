// deck.test.js — юнит-тесты логики колоды.
// Запуск: node --test (из корня проекта).
// Используются только встроенные модули Node.js, сторонние библиотеки не нужны.

import { test } from 'node:test';           // функция, объявляющая один тест
import assert from 'node:assert/strict';    // проверки: если условие ложно, тест падает
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { loadDeck, pickRandomCard, splitText, ADVICE_HEADING } from '../js/deck.js';

// Папка проекта = папка выше той, где лежит этот файл.
// Считаем путь от файла теста, а не от текущей папки терминала,
// чтобы тесты работали, откуда бы их ни запустили.
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

// Читаем настоящую колоду с диска. В Node.js нет страницы и fetch к файлам,
// поэтому файл читаем напрямую через модуль fs.
const deck = JSON.parse(readFileSync(join(projectRoot, 'cards.json'), 'utf-8'));

// ---------- Проверки данных ----------

test('в колоде 64 карты', () => {
  assert.equal(deck.length, 64);
});

test('у каждой карты есть все пять полей, а title, quote и text не пустые', () => {
  for (const card of deck) {
    // Сравниваем отсортированные списки ключей: так порядок полей в JSON не важен,
    // а лишнее или пропущенное поле сразу будет заметно.
    assert.deepEqual(
      Object.keys(card).sort(),
      ['id', 'image', 'quote', 'text', 'title'],
      `карта ${card.id}: неверный набор полей`,
    );
    assert.equal(typeof card.id, 'number', `карта ${card.id}: id должен быть числом`);

    for (const field of ['title', 'quote', 'text']) {
      // trim() убирает пробелы: строка из одних пробелов тоже считается пустой.
      assert.ok(card[field].trim().length > 0, `карта ${card.id}: пустое поле ${field}`);
    }
  }
});

test('id всех карт уникальны', () => {
  // Set хранит только разные значения. Если id повторяются, Set будет меньше массива.
  const ids = new Set(deck.map((card) => card.id));
  assert.equal(ids.size, deck.length);
});

test('файл картинки для каждой карты существует', () => {
  for (const card of deck) {
    const imagePath = join(projectRoot, card.image);
    assert.ok(existsSync(imagePath), `нет файла ${card.image}`);
  }
});

test('в каждом толковании есть подзаголовок «Наставление»', () => {
  for (const card of deck) {
    const blocks = splitText(card.text);
    const headings = blocks.filter((block) => block.type === 'heading');
    assert.equal(headings.length, 1, `карта ${card.id}: ожидался один подзаголовок`);
  }
});

// ---------- Выбор случайной карты ----------

test('выбранная карта всегда есть в колоде', () => {
  // Случайность нельзя проверить одним запуском, поэтому тянем много раз.
  for (let i = 0; i < 1000; i++) {
    const card = pickRandomCard(deck);
    assert.ok(deck.includes(card));
  }
});

test('карта не повторяется два раза подряд', () => {
  let previousId = null;
  for (let i = 0; i < 1000; i++) {
    const card = pickRandomCard(deck, previousId);
    assert.notEqual(card.id, previousId);
    previousId = card.id;
  }
});

test('прошлая карта исключается даже при «неудачном» случайном числе', () => {
  // Подставляем random, который всегда возвращает 0, то есть первую карту.
  // Если прошлой была первая карта, должна выпасть вторая.
  const card = pickRandomCard(deck, deck[0].id, () => 0);
  assert.equal(card.id, deck[1].id);
});

test('крайние значения random не выходят за границы колоды', () => {
  // 0.9999 — почти единица. Индекс должен быть последним, а не выходить за массив.
  assert.equal(pickRandomCard(deck, null, () => 0), deck[0]);
  assert.equal(pickRandomCard(deck, null, () => 0.9999), deck[deck.length - 1]);
});

test('из колоды в одну карту можно тянуть повторно', () => {
  const single = [deck[0]];
  assert.equal(pickRandomCard(single, deck[0].id), deck[0]);
});

test('из пустой колоды тянуть нельзя', () => {
  assert.throws(() => pickRandomCard([]));
});

// ---------- Разбор текста ----------

test('splitText делит текст на абзацы и находит подзаголовок', () => {
  const text = `Первый абзац.\nВторой абзац.\n${ADVICE_HEADING}\nСовет.`;
  assert.deepEqual(splitText(text), [
    { type: 'paragraph', text: 'Первый абзац.' },
    { type: 'paragraph', text: 'Второй абзац.' },
    { type: 'heading', text: ADVICE_HEADING },
    { type: 'paragraph', text: 'Совет.' },
  ]);
});

test('splitText пропускает пустые строки', () => {
  assert.deepEqual(splitText('Абзац.\n\n  \nЕщё абзац.'), [
    { type: 'paragraph', text: 'Абзац.' },
    { type: 'paragraph', text: 'Ещё абзац.' },
  ]);
});

// ---------- Загрузка колоды ----------

// Поддельный fetch: возвращает объект с теми же полями, что и настоящий ответ.
// Так мы проверяем loadDeck без сети и без браузера.
function fakeFetch(ok, status, data) {
  return async () => ({ ok, status, json: async () => data });
}

test('loadDeck возвращает массив карт из ответа', async () => {
  const result = await loadDeck('cards.json', fakeFetch(true, 200, deck));
  assert.equal(result.length, 64);
});

test('loadDeck сообщает об ошибке, если файл не найден', async () => {
  // assert.rejects ждёт, что асинхронная функция завершится ошибкой.
  await assert.rejects(loadDeck('cards.json', fakeFetch(false, 404, null)), /404/);
});

test('loadDeck сообщает об ошибке, если колода пустая', async () => {
  await assert.rejects(loadDeck('cards.json', fakeFetch(true, 200, [])));
});
