import { STORAGE_KEY, SUBJECTS, PRIORITIES, localDate, validateTask, parseBackup, statistics, selectTasks, demoTasks } from './domain.mjs';

const $ = selector => document.querySelector(selector);
const esc = value => String(value).replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const paths = {
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  tasks:'<rect x="5" y="4" width="15" height="17" rx="3"/><path d="M9 4V2m7 2V2M9 9h7m-7 4h7m-7 4h4"/>',
  book:'<path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v15"/>',
  chart:'<path d="M4 3v17h17M8 16v-5m5 5V6m5 10V9"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', check:'<path d="m5 12 4 4L19 6"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-13 4h2m4 0h2"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  settings:'<path d="m9 3 1-1h4l1 1 .5 3 2.5 1 3 1v4l-2 2-.5 3-2 2-3-.5-2 2H8l-1-3-2-1-2-2 .5-3L2 9l1-3 3-.5L8 3Z"/><circle cx="12" cy="12" r="3"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  edit:'<path d="m15 4 5 5M3 21l5-1L21 7a2 2 0 0 0-4-4L4 16Z"/>',
  trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.tasks}</svg>`;
const nav = [['today','home','Сегодня'],['tasks','tasks','Задания'],['subjects','book','Предметы'],['stats','chart','Прогресс']];
const ui = { view: 'today', status: 'active', query: '', subject: '', sort: 'due' };
let tasks = [], storageError = '', damaged = null, installPrompt = null, swRegistration = null, toastTimer;
try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) tasks = parseBackup(stored);
} catch (error) {
  try { damaged = localStorage.getItem(STORAGE_KEY); } catch {}
  storageError = 'Не удалось прочитать сохранённые задания. Скачайте резервную копию в настройках. Изменения не будут записаны до восстановления данных.';
}

function persist(next) {
  try {
    if (damaged !== null) throw new Error('Сначала скачайте повреждённую копию, затем импортируйте исправленный файл.');
    localStorage.setItem(STORAGE_KEY, JSON.stringify({version:1,tasks:next}));
    tasks = next;
    storageError = '';
    return true;
  } catch (error) { toast(error.message || 'Не удалось сохранить данные. Проверьте доступ к памяти браузера.'); return false; }
}
function toast(text) {
  clearTimeout(toastTimer); $('#toast').textContent = text; $('#toast').classList.add('visible');
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 5000);
}
function dateText(value) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat('ru-RU', {day:'numeric',month:'short'}).format(date).replace('.', '');
}
function subjects() { return [...new Set([...SUBJECTS, ...tasks.map(t => t.subject)])].sort((a,b) => a.localeCompare(b,'ru')); }
function addButton() { return `<button class="button primary" data-action="add">${icon('plus')}<span>Добавить<span class="long-add"> задание</span></span></button>`; }
function head(title, subtitle, eyebrow = 'ВАШ УЧЕБНЫЙ РИТМ') {
  return `<div class="page-head"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p class="subtitle">${subtitle}</p></div>${addButton()}</div>`;
}
function summary(s) {
  return `<div class="summary-grid">${[['tasks',s.active,'В работе'],['check',s.done,'Выполнено'],['clock',s.overdue,'Срок прошёл']].map(x => `<div class="summary-card"><span class="summary-icon">${icon(x[0])}</span><div><strong>${x[1]}</strong><small>${x[2]}</small></div></div>`).join('')}</div>`;
}
function taskCard(t) {
  const late = !t.done && t.due < localDate();
  const today = t.due === localDate();
  return `<article class="task ${t.done?'completed':''}" data-id="${esc(t.id)}"><button class="task-check ${t.done?'done':''}" data-action="toggle" data-id="${esc(t.id)}" aria-label="${esc(t.done?'Вернуть в работу: '+t.title:'Выполнить: '+t.title)}" aria-pressed="${t.done}">${t.done?icon('check'):''}</button><div class="task-content"><div class="task-title">${esc(t.title)}</div><div class="task-meta"><span class="subject-tag">${esc(t.subject)}</span><span class="due ${late?'overdue':''}">${icon('calendar')}${late?'Просрочено · ':''}${today?'Сегодня':dateText(t.due)}</span><span class="priority ${t.priority}">${PRIORITIES[t.priority]}</span></div>${t.notes?`<p class="task-notes">${esc(t.notes)}</p>`:''}</div><div class="task-controls"><button data-action="edit" data-id="${esc(t.id)}" aria-label="${esc('Редактировать: '+t.title)}">${icon('edit')}</button><button data-action="delete" data-id="${esc(t.id)}" aria-label="${esc('Удалить: '+t.title)}">${icon('trash')}</button></div></article>`;
}
function empty(kind = 'tasks') {
  const texts = kind === 'today' ? ['На сегодня всё спокойно','Заданий с ближайшим сроком нет. Посмотрите все задания или добавьте новое.'] : tasks.length ? ['Ничего не найдено','Попробуйте изменить поиск или фильтры.'] : ['Начните с одного задания','Добавьте первую задачу или посмотрите, как планер работает на учебном примере.'];
  return `<div class="empty"><div class="empty-icon">${icon('book')}</div><h3>${texts[0]}</h3><p>${texts[1]}</p><div class="button-row">${!tasks.length?`<button class="button primary" data-action="add">${icon('plus')}Первое задание</button><button class="button secondary" data-action="demo">Посмотреть пример</button>`:kind==='today'?'<button class="button secondary" data-action="all-tasks">Все задания</button>':''}</div></div>`;
}
function renderToday() {
  const s = statistics(tasks);
  const list = selectTasks(tasks, {todayOnly:true});
  const day = new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
  return head('Сегодня',esc(day),'СОБЕРИТЕ ДЕНЬ ПО ШАГАМ') + `<section class="hero" aria-label="План на сегодня"><div><span class="eyebrow">ФОКУС НА ГЛАВНОМ</span><h2>${s.today?'Сегодня — ещё один шаг вперёд':'Хороший день начинается с плана'}</h2><p>${s.today?'Начните с самого важного задания. Остальное уже в вашем планере.':'Планируйте учёбу в своём темпе и отмечайте каждый завершённый шаг.'}</p></div><div class="hero-counter"><span class="hero-number">${s.today}</span><span>на сегодня</span></div></section>` + summary(s) + `<div class="section-head"><h2>Ближайшие задания</h2><button class="link-button" data-action="all-tasks">Все задания →</button></div><div class="tasks">${list.length?list.map(taskCard).join(''):empty('today')}</div>`;
}
function renderTasks() {
  return head('Задания','Всё, что нужно сделать, в одном месте.') + `<div class="filters"><div class="chips" role="group" aria-label="Статус задания">${[['active','В работе'],['done','Выполнено'],['all','Все']].map(([value,label])=>`<button class="chip ${ui.status===value?'active':''}" data-action="status" data-value="${value}" aria-pressed="${ui.status===value}">${label}</button>`).join('')}</div><div class="search-box">${icon('search')}<input id="search" aria-label="Поиск заданий" placeholder="Найти задание или предмет" value="${esc(ui.query)}" maxlength="200"></div><div class="filter-row"><select id="subject-filter" aria-label="Фильтр по предмету"><option value="">Все предметы</option>${subjects().map(s=>`<option value="${esc(s)}" ${ui.subject===s?'selected':''}>${esc(s)}</option>`).join('')}</select><select id="sort" aria-label="Сортировка"><option value="due" ${ui.sort==='due'?'selected':''}>По сроку сдачи</option><option value="priority" ${ui.sort==='priority'?'selected':''}>По приоритету</option></select></div></div><div class="section-head"><h2>Список заданий</h2><span id="result-count" class="small"></span></div><div id="task-list" class="tasks"></div>`;
}
function updateList() {
  if (ui.view !== 'tasks') return;
  const list = selectTasks(tasks, ui);
  $('#task-list').innerHTML = list.length ? list.map(taskCard).join('') : empty();
  $('#result-count').textContent = `Найдено: ${list.length}`;
}
function renderSubjects() {
  return head('Предметы','Учебная нагрузка по каждому направлению.') + `<div class="subject-grid">${subjects().map(subject=>{
    const s = statistics(tasks.filter(t=>t.subject===subject));
    return `<button class="subject-card" data-action="subject" data-value="${esc(subject)}">${icon('book')}<h3>${esc(subject)}</h3><p>В работе: ${s.active}</p><div class="progress" aria-hidden="true"><span style="width:${s.percent}%"></span></div><div class="subject-foot"><span>Выполнено ${s.done} из ${s.total}</span><span>${s.percent}%</span></div></button>`;
  }).join('')}</div><p class="tip" style="margin-top:20px">Нажмите на предмет, чтобы открыть его задания. Новый предмет можно указать при добавлении задания.</p>`;
}
function renderStats() {
  const s = statistics(tasks);
  return head('Ваш прогресс','Каждое выполненное задание имеет значение.') + summary(s) + `<section class="stats-panel"><div class="stats-overview"><div class="ring" style="--value:${s.percent}%" aria-label="Выполнено ${s.percent} процентов"><div class="ring-inner"><strong>${s.percent}%</strong><small>выполнено</small></div></div><div><h3>${s.done?'Движение вперёд':'Первый шаг впереди'}</h3><p>Выполнено ${s.done} из ${s.total} заданий.<br>В работе осталось: ${s.active}.</p></div></div></section><section class="stats-panel"><h2>По предметам</h2>${subjects().filter(subject=>tasks.some(t=>t.subject===subject)).map(subject=>{const x=statistics(tasks.filter(t=>t.subject===subject));return `<div class="subject-stat"><div><strong>${esc(subject)}</strong><span>${x.done} / ${x.total}</span></div><div class="progress" aria-label="Выполнено ${x.percent} процентов"><span style="width:${x.percent}%"></span></div></div>`;}).join('') || '<p class="subtitle" style="margin-top:15px">Добавьте задания, чтобы увидеть статистику.</p>'}</section><p class="tip"><strong>Свой темп — лучший темп.</strong> Разбивайте большие задания на небольшие шаги, чтобы легче двигаться к результату.</p>`;
}
function render() {
  document.querySelectorAll('[data-view]').forEach(button=>{const selected=button.dataset.view===ui.view;button.classList.toggle('selected',selected);button.setAttribute('aria-current',selected?'page':'false');});
  $('#view').innerHTML = (storageError?`<p class="storage-error" role="alert">${esc(storageError)}</p>`:'') + ({today:renderToday,tasks:renderTasks,subjects:renderSubjects,stats:renderStats}[ui.view] || renderToday)();
  updateList();
}
function navigate(view) { ui.view=view; render(); window.scrollTo({top:0}); }
function openTask(id) {
  const task = tasks.find(t=>t.id===id);
  $('#task-form').reset(); $('#form-error').textContent='';
  $('#task-dialog-title').textContent = task ? 'Редактировать задание' : 'Новое задание';
  $('#task-id').value = task?.id || '';
  $('#task-title').value = task?.title || '';
  $('#task-subject').value = task?.subject || (ui.subject || '');
  $('#task-due').value = task?.due || localDate();
  $('#task-priority').value = task?.priority || 'normal';
  $('#task-notes').value = task?.notes || '';
  $('#subject-list').innerHTML = subjects().map(s=>`<option value="${esc(s)}"></option>`).join('');
  $('#task-dialog').showModal(); $('#task-title').focus();
}
function confirmAction(text) {
  return new Promise(resolve=>{
    const dialog=$('#confirm-dialog'); $('#confirm-text').textContent=text;
    const done=value=>{dialog.close();$('#confirm-accept').removeEventListener('click',yes);$('#confirm-cancel').removeEventListener('click',no);dialog.removeEventListener('cancel',cancel);resolve(value);};
    const yes=()=>done(true),no=()=>done(false),cancel=event=>{event.preventDefault();done(false);};
    $('#confirm-accept').addEventListener('click',yes);$('#confirm-cancel').addEventListener('click',no);dialog.addEventListener('cancel',cancel);dialog.showModal();
  });
}
function addDemo() {
  const next = [...tasks,...demoTasks().filter(t=>!tasks.some(old=>old.id===t.id))];
  if (next.length > 2000) return toast('Достигнут предел 2000 заданий.');
  if(persist(next)){render();toast('Учебный пример добавлен. Это демонстрационные задания.');}
}
for (const selector of ['#desktop-nav','#mobile-nav']) $(selector).innerHTML = nav.map(([view,name,label])=>`<button class="nav-item" data-view="${view}">${icon(name)}<span>${label}</span></button>`).join('');
$('#settings').innerHTML=icon('settings'); document.querySelectorAll('[data-close]').forEach(b=>{b.innerHTML=icon('close');b.addEventListener('click',()=>b.closest('dialog').close());});
document.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.view){navigate(button.dataset.view);return;}
  const action=button.dataset.action,id=button.dataset.id;
  if(action==='add')openTask();
  if(action==='edit')openTask(id);
  if(action==='all-tasks'){ui.status='active';ui.subject='';ui.query='';navigate('tasks');}
  if(action==='status'){ui.status=button.dataset.value;render();}
  if(action==='subject'){ui.subject=button.dataset.value;ui.status='all';ui.query='';navigate('tasks');}
  if(action==='demo')addDemo();
  if(action==='toggle' && persist(tasks.map(t=>t.id===id?{...t,done:!t.done}:t))){render();toast('Статус задания обновлён.');}
  if(action==='delete'){
    const task=tasks.find(t=>t.id===id);if(!task)return;
    if(await confirmAction(`Удалить задание «${task.title}»?`)){if(persist(tasks.filter(t=>t.id!==id))){render();toast('Задание удалено.');}}
  }
});
$('#main').addEventListener('input',event=>{if(event.target.id==='search'){ui.query=event.target.value;updateList();}});
$('#main').addEventListener('change',event=>{if(event.target.id==='subject-filter')ui.subject=event.target.value;if(event.target.id==='sort')ui.sort=event.target.value;updateList();});
$('#task-form').addEventListener('submit',event=>{
  event.preventDefault();
  try {
    const old=tasks.find(t=>t.id===$('#task-id').value);
    if(!old && tasks.length>=2000)throw new Error('Достигнут предел 2000 заданий.');
    const task=validateTask({id:old?.id || crypto.randomUUID(),title:$('#task-title').value,subject:$('#task-subject').value,due:$('#task-due').value,priority:$('#task-priority').value,notes:$('#task-notes').value,done:old?.done || false});
    const next=old?tasks.map(t=>t.id===task.id?task:t):[...tasks,task];
    if(persist(next)){$('#task-dialog').close();render();toast(old?'Изменения сохранены.':'Задание добавлено.');}
  }catch(error){$('#form-error').textContent=error.message;}
});
function download(text,name) {
  const url=URL.createObjectURL(new Blob([text],{type:'application/json;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
$('#export').addEventListener('click',()=>download(damaged ?? JSON.stringify({version:1,exportedAt:new Date().toISOString(),tasks},null,2),`study-planner-${localDate()}${damaged!==null?'-damaged':''}.json`));
$('#import').addEventListener('change',async event=>{
  const file=event.target.files[0];event.target.value='';if(!file)return;
  try {
    if(file.size>2*1024*1024)throw new Error('Размер файла превышает 2 МБ.');
    const next=parseBackup(await file.text());
    if(await confirmAction(`Импортировать ${next.length} заданий? Текущие ${tasks.length} заданий будут заменены. Сохраните резервную копию перед заменой.`)){
      const oldDamaged=damaged;damaged=null;
      if(persist(next)){render();$('#settings-dialog').close();toast('Резервная копия восстановлена.');}else damaged=oldDamaged;
    }
  }catch(error){toast(`Импорт не выполнен: ${error.message}`);}
});
$('#demo').addEventListener('click',()=>{$('#settings-dialog').close();addDemo();});
$('#settings').addEventListener('click',()=>{updateInstallHelp();$('#settings-dialog').showModal();});
function updateInstallHelp() {
  const installed=window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  $('#install-help').textContent=installed?'Приложение уже открыто в установленном режиме.':installPrompt?'Нажмите кнопку, чтобы подтвердить установку.':/iPad|iPhone|iPod/.test(navigator.userAgent)?'В Safari нажмите «Поделиться» → «На экран Домой».':'В Chrome на Android откройте меню ⋮ → «Установить приложение» или «Добавить на главный экран». При первом открытии дождитесь загрузки приложения.';
  $('#install').disabled=Boolean(installed);
  $('#offline-state').textContent=navigator.serviceWorker?.controller?'Офлайн-режим подготовлен. После первого открытия планер работает без сети.':'Офлайн-режим подготавливается. Для первого открытия необходимо соединение.';
}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;updateInstallHelp();});
window.addEventListener('appinstalled',()=>{installPrompt=null;toast('Приложение установлено.');updateInstallHelp();});
$('#install').addEventListener('click',async()=>{
  if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();await prompt.userChoice;}
  else toast('Откройте меню Chrome ⋮ и выберите установку приложения.');
  updateInstallHelp();
});
function connection(){const online=navigator.onLine;$('#connection').textContent=online?'В сети':'Офлайн';$('#connection').classList.toggle('offline',!online);}
window.addEventListener('online',connection);window.addEventListener('offline',connection);
window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY){try{tasks=event.newValue?parseBackup(event.newValue):[];render();toast('Данные обновлены из другой вкладки.');}catch{toast('Не удалось прочитать данные из другой вкладки.');}}});
window.addEventListener('pageshow',()=>render());
if('serviceWorker' in navigator){
  let refreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{$('#update-app')?.remove();if(refreshing)return;refreshing=true;updateInstallHelp();});
  navigator.serviceWorker.register('./sw.js').then(registration=>{
    swRegistration=registration;
    const offerUpdate=()=>{
      if(!registration.waiting){$('#update-app')?.remove();return;}
      if(!navigator.serviceWorker.controller || $('#update-app'))return;
      const b=document.createElement('button');b.id='update-app';b.className='update-button';b.textContent='Обновить приложение';
      b.addEventListener('click',async()=>{
        if(!registration.waiting){b.remove();toast('Установлена актуальная версия.');return;}
        if($('#task-dialog').open){toast('Сохраните или закройте задание перед обновлением.');return;}
        if(await confirmAction('Обновить приложение? Сохранённые задания останутся на устройстве.')){
          const waiting=registration.waiting;
          if(!waiting){b.remove();toast('Установлена актуальная версия.');return;}
          b.disabled=true;
          navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});
          waiting.postMessage('SKIP_WAITING');
        }
      });
      $('.top-actions').prepend(b);
    };
    offerUpdate();registration.addEventListener('updatefound',()=>{registration.installing?.addEventListener('statechange',offerUpdate);});
    navigator.serviceWorker.ready.then(updateInstallHelp);
  }).catch(()=>toast('Офлайн-режим недоступен. Откройте приложение по HTTPS или через локальный сервер.'));
}
connection();render();
