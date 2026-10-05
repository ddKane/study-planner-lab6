export const STORAGE_KEY = 'study-planner-v1';
export const PRIORITIES = { high: 'Высокий', normal: 'Обычный', low: 'Низкий' };
export const SUBJECTS = ['Мобильная разработка', 'Математика', 'Английский язык', 'Программирование'];
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return y >= 2000 && y <= 2100 && date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}
export function validateTask(t) {
  if (!t || typeof t !== 'object' || Array.isArray(t)) throw new Error('Некорректный формат задания.');
  const title = typeof t.title === 'string' ? t.title.trim() : '';
  const subject = typeof t.subject === 'string' ? t.subject.trim() : '';
  const notes = typeof t.notes === 'string' ? t.notes.trim() : '';
  if (!title || title.length > 120) throw new Error('Название должно содержать от 1 до 120 символов.');
  if (!subject || subject.length > 60) throw new Error('Название предмета должно содержать от 1 до 60 символов.');
  if (!isDate(t.due)) throw new Error('Укажите корректную дату с 2000 по 2100 год.');
  if (!Object.hasOwn(PRIORITIES, t.priority)) throw new Error('Некорректный приоритет.');
  if (notes.length > 1000) throw new Error('Примечание не должно превышать 1000 символов.');
  if (typeof t.id !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/.test(t.id)) throw new Error('Некорректный идентификатор задания.');
  if (typeof t.done !== 'boolean') throw new Error('Некорректный статус задания.');
  return { id: t.id, title, subject, due: t.due, priority: t.priority, notes, done: t.done };
}
export function parseBackup(input) {
  const data = JSON.parse(input);
  if (!data || data.version !== 1 || !Array.isArray(data.tasks) || data.tasks.length > 2000) throw new Error('Нужен файл резервной копии Учебного планера версии 1, до 2000 заданий.');
  const tasks = data.tasks.map(validateTask);
  if (new Set(tasks.map(t => t.id)).size !== tasks.length) throw new Error('В файле повторяются идентификаторы заданий.');
  return tasks;
}
export function statistics(tasks, today = localDate()) {
  const done = tasks.filter(t => t.done).length;
  const active = tasks.filter(t => !t.done);
  return { total: tasks.length, done, active: active.length, today: active.filter(t => t.due === today).length, overdue: active.filter(t => t.due < today).length, percent: tasks.length ? Math.round(done / tasks.length * 100) : 0 };
}
export function selectTasks(tasks, { status = 'active', query = '', subject = '', sort = 'due', todayOnly = false } = {}, today = localDate()) {
  const q = query.trim().toLocaleLowerCase('ru');
  const ranks = { high: 0, normal: 1, low: 2 };
  return tasks.filter(t => (status === 'all' || (status === 'done' ? t.done : !t.done)) && (!subject || t.subject === subject) && (!todayOnly || t.due <= today) && (!q || `${t.title} ${t.subject} ${t.notes}`.toLocaleLowerCase('ru').includes(q)))
    .sort((a, b) => (sort === 'priority' ? ranks[a.priority] - ranks[b.priority] : 0) || a.due.localeCompare(b.due) || a.title.localeCompare(b.title, 'ru'));
}
export function demoTasks(today = new Date()) {
  const shift = n => { const d = new Date(today); d.setDate(d.getDate() + n); return localDate(d); };
  return [
    ['Подготовить публикацию PWA', SUBJECTS[0], 0, 'high', false, 'Иконки, описание и скриншоты для лабораторной работы 6.'],
    ['Решить задачи по интегралам', SUBJECTS[1], 0, 'normal', false, 'Задачи 1–8 из практикума.'],
    ['Повторить новые слова', SUBJECTS[2], 1, 'low', false, 'Unit 4: Education.'],
    ['Проверить REST API', SUBJECTS[3], 2, 'high', false, 'Основные запросы и обработка ошибок.'],
    ['Оформить отчёт по лабораторной', SUBJECTS[0], 3, 'normal', false, 'Добавить результаты тестирования и выводы.'],
    ['Разобрать лекцию по пределам', SUBJECTS[1], -1, 'normal', false, 'Составить краткий конспект.'],
    ['Сдать практическую работу', SUBJECTS[3], -2, 'normal', true, 'Работа завершена.']
  ].map((x, i) => ({ id: `demo-${i + 1}`, title: x[0], subject: x[1], due: shift(x[2]), priority: x[3], done: x[4], notes: x[5] }));
}
