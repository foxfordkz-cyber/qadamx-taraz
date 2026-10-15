import { useSyncExternalStore } from 'react';

export type Lang = 'ru' | 'kk';

const ru = {
  hero_title: 'Найдите магазин на рынке Тараза',
  hero_text: 'Выберите площадку, найдите точку и отправьте заявку продавцу.',
  find_shop: 'Найти магазин', seller_cabinet: 'Кабинет продавца',
  venues: 'Площадки', shops: 'Точки', open_venue: 'Открыть площадку',
  conceptual: 'Условная схема, не карта', conceptual_hint: 'Геометрия учебная и не отражает реальный план.',
  demo_data: 'Учебные данные',
  search: 'Поиск по точкам', all_categories: 'Все', no_shops: 'Ничего не найдено. Измените запрос или категорию.',
  catalog: 'Каталог', price_ask: 'Уточнить', back: 'Назад', overview: 'Общий вид',
  loading: 'Загрузка…', loading_scene: 'Загружаем 3D-сцену…',
  scene_off: 'WebGL недоступен — 3D отключено. Карточки ниже работают как обычно.',
  scene_error: 'Не удалось показать 3D-сцену. Карточки ниже работают как обычно.',
  model_error: 'Подробная модель не загрузилась, показаны простые блоки.',
  scene_label: '3D-схема площадки', enable_3d: 'Управлять 3D', disable_3d: 'Вернуть прокрутку',
  load_error: 'Не удалось загрузить данные', retry: 'Повторить',
  inquiry: 'Заявка продавцу', name: 'Имя (необязательно)', contact: 'Контакт',
  contact_hint: 'Телефон или Telegram в формате @username. Контакт увидит только продавец, публично он не показывается.',
  message: 'Сообщение', send: 'Отправить заявку', sending: 'Отправляем…',
  required: 'Заполните поле', too_short: 'Слишком коротко', too_long: 'Слишком длинно',
  contact_invalid: 'Укажите телефон или Telegram в формате @username.',
  send_error: 'Заявка не отправлена. Текст сохранён — нажмите «Отправить заявку» ещё раз.',
  sent_title: 'Заявка отправлена', request_no: 'Номер заявки',
  sent_text: 'Продавец увидит её в своём кабинете. Ответ и наличие товара зависят от продавца.',
  send_another: 'Отправить ещё одну',
} as const;

const kk: Record<keyof typeof ru, string> = {
  hero_title: 'Тараз базарынан дүкен табыңыз',
  hero_text: 'Алаңды таңдап, нүктені тауып, сатушыға өтінім жіберіңіз.',
  find_shop: 'Дүкен табу', seller_cabinet: 'Сатушы кабинеті',
  venues: 'Алаңдар', shops: 'Нүктелер', open_venue: 'Алаңды ашу',
  conceptual: 'Шартты схема, карта емес', conceptual_hint: 'Геометрия оқу мақсатында және нақты жоспарды көрсетпейді.',
  demo_data: 'Оқу деректері',
  search: 'Нүктелер бойынша іздеу', all_categories: 'Барлығы', no_shops: 'Ештеңе табылмады. Сұранысты немесе санатты өзгертіңіз.',
  catalog: 'Каталог', price_ask: 'Нақтылау', back: 'Артқа', overview: 'Жалпы көрініс',
  loading: 'Жүктелуде…', loading_scene: '3D-сахна жүктелуде…',
  scene_off: 'WebGL қолжетімсіз — 3D өшірулі. Төмендегі карточкалар әдеттегідей жұмыс істейді.',
  scene_error: '3D-сахнаны көрсету мүмкін болмады. Төмендегі карточкалар әдеттегідей жұмыс істейді.',
  model_error: 'Толық модель жүктелмеді, қарапайым блоктар көрсетілді.',
  scene_label: 'Алаңның 3D-схемасы', enable_3d: '3D басқару', disable_3d: 'Айналдыруды қайтару',
  load_error: 'Деректер жүктелмеді', retry: 'Қайталау',
  inquiry: 'Сатушыға өтінім', name: 'Аты (міндетті емес)', contact: 'Байланыс',
  contact_hint: 'Телефон немесе @username форматындағы Telegram. Байланысты тек сатушы көреді, ол жария көрсетілмейді.',
  message: 'Хабарлама', send: 'Өтінім жіберу', sending: 'Жіберілуде…',
  required: 'Өрісті толтырыңыз', too_short: 'Тым қысқа', too_long: 'Тым ұзын',
  contact_invalid: 'Телефонды немесе @username форматындағы Telegram-ды көрсетіңіз.',
  send_error: 'Өтінім жіберілмеді. Мәтін сақталды — «Өтінім жіберу» түймесін қайта басыңыз.',
  sent_title: 'Өтінім жіберілді', request_no: 'Өтінім нөмірі',
  sent_text: 'Сатушы оны өз кабинетінде көреді. Жауап пен тауардың болуы сатушыға байланысты.',
  send_another: 'Тағы бір өтінім жіберу',
};

const dict = { ru, kk };
export type Key = keyof typeof ru;

const read = (): Lang => {
  try { return localStorage.getItem('qadam.lang') === 'kk' ? 'kk' : 'ru'; } catch { return 'ru'; }
};
let lang: Lang = read();
const subs = new Set<() => void>();

export function setLang(l: Lang) {
  lang = l;
  try { localStorage.setItem('qadam.lang', l); } catch { /* ignore */ }
  subs.forEach((f) => f());
}

export function useT() {
  const l = useSyncExternalStore(
    (cb) => { subs.add(cb); return () => subs.delete(cb); },
    () => lang,
  );
  return {
    lang: l,
    t: (k: Key) => dict[l][k] ?? ru[k],
    name: (x: { name: string; name_kk?: string }) => (l === 'kk' && x.name_kk ? x.name_kk : x.name),
  };
}
