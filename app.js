(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const app = document.getElementById('app');
  const homeBtn = document.getElementById('homeBtn');
  const helpBtn = document.getElementById('helpBtn');
  const modal = document.getElementById('modal');

  const state = {
    screen: 'home',
    grade: null,
    mode: null, // 'ct' | 'subjects'
    subjectId: null,
    ticketId: null,
    topicId: null,
    testStep: 0,
    testAnswers: {},
    testScore: 0,
    lastExplainOpen: null,
  };

  function resetFlow(keepGrade = false){
    const g = state.grade;
    Object.assign(state, {
      screen: 'home',
      grade: keepGrade ? g : null,
      mode: null,
      subjectId: null,
      ticketId: null,
      topicId: null,
      testStep: 0,
      testAnswers: {},
      testScore: 0,
      lastExplainOpen: null,
    });
  }

  function setScreen(next){
    state.screen = next;
    render();
    window.scrollTo({top:0, behavior:'smooth'});
  }

  function openModal(title, bodyHtml){
    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = bodyHtml;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
  }

  function closeModal(){
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
  }

  function escapeHtml(str){
    return String(str)
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#039;');
  }

  function pill(text){
    return `<span class="pill">${escapeHtml(text)}</span>`;
  }

  function hero(){
    return `
      <section class="hero">
        <div class="hero__grid">
          <div>
            <div class="hero__badge">Вайб как у Telegram · минимум воды · максимум смысла</div>
            <h1 class="hero__title">Понимай тему за <span class="u-blue">5 минут</span> — и сразу закрепляй тестом</h1>
            <p class="hero__lead">Короткие конспекты “по делу”: события, даты, личности, правила, примеры. Никаких полотен на 30 минут.</p>
            <div class="hero__actions">
              <button class="btn btn--primary" id="startBtn" type="button">Приступить к обучению!</button>
              <button class="btn btn--ghost" id="demoBtn" type="button">Показать демо билета</button>
            </div>
            <div class="hero__meta">
              ${pill('Синие кнопки')}
              ${pill('Жирные заголовки')}
              ${pill('Мемы в начале 😄')}
              ${pill('Тесты по этапам')}
            </div>
          </div>
          <div class="hero__art">
            <img src="assets/hero.svg" alt="" />
          </div>
        </div>
      </section>
    `;
  }

  function cardGrid(itemsHtml){
    return `<div class="grid">${itemsHtml}</div>`;
  }

  function stepHeader(title, subtitle){
    return `
      <div class="step">
        <h2 class="step__title">${escapeHtml(title)}</h2>
        <div class="step__sub">${escapeHtml(subtitle)}</div>
      </div>
    `;
  }

  function breadcrumbs(){
    const parts = [];
    if(state.grade) parts.push({label:`${state.grade} класс`, action: () => setScreen('mode')});
    if(state.mode) parts.push({label: state.mode === 'ct' ? 'ЦТ' : 'Предметы', action: () => setScreen(state.mode === 'ct' ? 'ct_subject' : 'subjects_subject')});
    if(state.subjectId){
      const subj = getSubject();
      if(subj) parts.push({label: subj.name, action: () => {
        if(state.mode === 'ct') setScreen('ct_ticket'); else setScreen('subjects_topic');
      }});
    }
    if(state.ticketId){
      const t = getTicket();
      if(t) parts.push({label: t.title, action: () => setScreen('ticket_view')});
    }
    if(state.topicId){
      const tp = getTopic();
      if(tp) parts.push({label: tp.title, action: () => setScreen('topic_view')});
    }

    if(parts.length === 0) return '';

    const html = parts.map((p, idx) => {
      const isLast = idx === parts.length - 1;
      return `
        <button class="crumb ${isLast ? 'is-last':''}" type="button" data-crumb="${idx}">
          ${escapeHtml(p.label)}
        </button>
      `;
    }).join('<span class="crumb__sep">›</span>');

    setTimeout(() => {
      $$('.crumb').forEach(btn => {
        btn.addEventListener('click', () => {
          const i = Number(btn.getAttribute('data-crumb'));
          parts[i].action();
        });
      });
    }, 0);

    return `<div class="crumbs">${html}</div>`;
  }

  function getSubject(){
    if(!state.mode || !state.subjectId) return null;
    if(state.mode === 'ct') return DB.ct.subjects.find(s => s.id === state.subjectId) || null;
    const byGrade = DB.subjectsByGrade[String(state.grade)] || {subjects:[]};
    return byGrade.subjects.find(s => s.id === state.subjectId) || null;
  }

  function getTicket(){
    const s = getSubject();
    if(!s || !state.ticketId) return null;
    return (s.tickets || []).find(t => t.id === state.ticketId) || null;
  }

  function getTopic(){
    const s = getSubject();
    if(!s || !state.topicId) return null;
    return (s.topics || []).find(t => t.id === state.topicId) || null;
  }

  function renderHome(){
    app.innerHTML = `
      ${hero()}
      <section class="section">
        <div class="section__card">
          <h3 class="section__title">Что внутри</h3>
          <div class="cols">
            <div class="col">
              <div class="kpi"><div class="kpi__num">5</div><div class="kpi__txt">минут на билет/тему</div></div>
              <p class="p">Кратко, по делу: даты, личности, термины, формулы, правила — всё, что реально спрашивают.</p>
            </div>
            <div class="col">
              <div class="kpi"><div class="kpi__num">2</div><div class="kpi__txt">минуты на тест</div></div>
              <p class="p">Сначала простое, потом посложнее. Ошибся — сразу видишь объяснение.</p>
            </div>
            <div class="col">
              <div class="kpi"><div class="kpi__num">0</div><div class="kpi__txt">воды</div></div>
              <p class="p">Никаких “как известно с древнейших времён…” — только смысл и примеры.</p>
            </div>
          </div>
        </div>
      </section>
    `;

    $('#startBtn').addEventListener('click', () => setScreen('grade'));
    $('#demoBtn').addEventListener('click', () => {
      state.grade = 9;
      state.mode = 'ct';
      state.subjectId = 'hist_by';
      state.ticketId = 'hist_1';
      setScreen('ticket_view');
    });
  }

  function renderGrade(){
    const cards = DB.grades.map(g => `
      <button class="card card--pick" type="button" data-grade="${g}">
        <div class="card__title">${g} класс</div>
        <div class="card__sub">Выбор маршрута обучения</div>
      </button>
    `).join('');

    app.innerHTML = `
      ${breadcrumbs()}
      ${stepHeader('Выбери класс', 'Дальше — ЦТ или школьные темы')}
      ${cardGrid(cards)}
      <div class="space"></div>
    `;

    $$('.card--pick').forEach(btn => {
      btn.addEventListener('click', () => {
        state.grade = Number(btn.getAttribute('data-grade'));
        setScreen('mode');
      });
    });
  }

  function renderMode(){
    const warn = state.grade < 9
      ? `<div class="note"><b>Псс:</b> ЦТ обычно актуально ближе к 9–11 классам. Но демо можно открыть хоть сейчас.</div>`
      : '';

    app.innerHTML = `
      ${breadcrumbs()}
      ${stepHeader('Что выбираем?', 'Подготовка к ЦТ или школьные темы')}
      ${warn}
      <div class="grid grid--2">
        <button class="card card--big" type="button" id="ctMode">
          <div class="card__emoji">🧠</div>
          <div class="card__title">Подготовка к ЦТ</div>
          <div class="card__sub">История, математика, русский, белорусский</div>
        </button>
        <button class="card card--big" type="button" id="subjMode">
          <div class="card__emoji">📚</div>
          <div class="card__title">Предметы</div>
          <div class="card__sub">Темы по предметам (быстрые конспекты)</div>
        </button>
      </div>
    `;

    $('#ctMode').addEventListener('click', () => {
      state.mode = 'ct';
      setScreen('ct_subject');
    });
    $('#subjMode').addEventListener('click', () => {
      state.mode = 'subjects';
      setScreen('subjects_subject');
    });
  }

  function renderCtSubject(){
    const cards = DB.ct.subjects.map(s => `
      <button class="card" type="button" data-subject="${s.id}">
        <div class="card__row">
          <div class="avatar">${escapeHtml(s.emoji)}</div>
          <div>
            <div class="card__title">${escapeHtml(s.name)}</div>
            <div class="card__sub">Билеты · кратко · тест по этапам</div>
          </div>
        </div>
        <div class="card__img"><img src="${escapeHtml(s.coverImg)}" alt="" /></div>
      </button>
    `).join('');

    app.innerHTML = `
      ${breadcrumbs()}
      ${stepHeader('ЦТ: выбери предмет', 'Дальше — список билетов')}
      ${cardGrid(cards)}
    `;

    $$('[data-subject]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.subjectId = btn.getAttribute('data-subject');
        state.ticketId = null;
        setScreen('ct_ticket');
      });
    });
  }

  function renderCtTicketList(){
    const subj = getSubject();
    const tickets = (subj?.tickets || []).map(t => `
      <button class="card" type="button" data-ticket="${t.id}">
        <div class="card__title">${escapeHtml(t.title)}</div>
        <div class="card__sub">${escapeHtml(t.brief)}</div>
        <div class="card__chips">
          ${t.keywords.map(pill).join('')}
        </div>
      </button>
    `).join('');

    app.innerHTML = `
      ${breadcrumbs()}
      ${stepHeader('ЦТ: выбери билет', subj ? subj.name : '')}
      ${tickets || `<div class="note">Пока тут пусто — добавь билеты в <b>data.js</b>.</div>`}
    `;

    $$('[data-ticket]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.ticketId = btn.getAttribute('data-ticket');
        setScreen('ticket_view');
      });
    });
  }

  function renderSubjectsSubject(){
    const byGrade = DB.subjectsByGrade[String(state.grade)] || {subjects:[]};
    const subjects = byGrade.subjects || [];

    const cards = subjects.length
      ? subjects.map(s => `
          <button class="card" type="button" data-subject="${s.id}">
            <div class="card__row">
              <div class="avatar">${escapeHtml(s.emoji || '📘')}</div>
              <div>
                <div class="card__title">${escapeHtml(s.name)}</div>
                <div class="card__sub">Темы · кратко · тест</div>
              </div>
            </div>
            <div class="card__img"><img src="${escapeHtml(s.coverImg)}" alt="" /></div>
          </button>
        `).join('')
      : `<div class="note"><b>Демо:</b> для 7 класса уже есть примеры тем. Для остальных можно дописать в <b>data.js</b>.</div>`;

    app.innerHTML = `
      ${breadcrumbs()}
      ${stepHeader('Предметы: выбери предмет', 'Дальше — выбор темы')}
      ${subjects.length ? cardGrid(cards) : cards}
    `;

    $$('[data-subject]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.subjectId = btn.getAttribute('data-subject');
        state.topicId = null;
        setScreen('subjects_topic');
      });
    });
  }

  function renderSubjectsTopicList(){
    const subj = getSubject();
    const topics = (subj?.topics || []).map(t => `
      <button class="card" type="button" data-topic="${t.id}">
        <div class="card__title">${escapeHtml(t.title)}</div>
        <div class="card__sub">${escapeHtml(t.brief)}</div>
        <div class="card__chips">
          ${(t.keywords || []).map(pill).join('')}
        </div>
      </button>
    `).join('');

    app.innerHTML = `
      ${breadcrumbs()}
      ${stepHeader('Выбери тему', subj ? subj.name : '')}
      ${topics || `<div class="note">Тут пока нет тем — добавь в <b>data.js</b>.</div>`}
    `;

    $$('[data-topic]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.topicId = btn.getAttribute('data-topic');
        setScreen('topic_view');
      });
    });
  }

  function renderTicketView(){
    const subj = getSubject();
    const t = getTicket();
    if(!subj || !t){
      app.innerHTML = `<div class="note">Билет не найден. Вернись назад.</div>`;
      return;
    }

    app.innerHTML = `
      ${breadcrumbs()}
      <div class="paper">
        <div class="paper__head">
          <div>
            <div class="paper__kicker">ЦТ · ${escapeHtml(subj.name)}</div>
            <h2 class="paper__title">${escapeHtml(t.title)}</h2>
            <div class="paper__brief">${escapeHtml(t.brief)}</div>
          </div>
          <div class="paper__meta">
            ${t.keywords.map(pill).join('')}
          </div>
        </div>

        <div class="meme">
          <div class="meme__img"><img src="${escapeHtml(t.memeImg)}" alt="" /></div>
          <div class="meme__txt">
            <div class="meme__cap"><b>Разогрев мозга:</b> мемчик перед тем как стать умным 😄</div>
            <div class="meme__sub">Потом уже серьёзно — но всё равно по-вайбовому.</div>
          </div>
        </div>

        <div class="paper__body">
          <div class="section2">
            <h3>Коротко по делу</h3>
            <div class="bullets">${t.short.map(x => `<div class="bullet">${x}</div>`).join('')}</div>
          </div>

          <div class="section2">
            <h3>Шпаргалка</h3>
            <div class="split">
              <div class="box">
                <div class="box__title">Таймлайн / числа</div>
                <ul class="list">${t.timeline.map(x => `<li>${x}</li>`).join('')}</ul>
              </div>
              <div class="box">
                <div class="box__title">Термины (без занудства)</div>
                <ul class="list">${t.terms.map(x => `<li>${x}</li>`).join('')}</ul>
              </div>
            </div>
          </div>

          <div class="section2">
            <h3>Картинки для запоминания</h3>
            <div class="gallery">
              ${t.images.map(img => `
                <button class="imgcard" type="button" data-openimg="${escapeHtml(img.src)}" data-imgtitle="${escapeHtml(img.title)}">
                  <img src="${escapeHtml(img.src)}" alt="" />
                  <div class="imgcard__cap">${escapeHtml(img.title)}</div>
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="paper__actions">
          <button class="btn btn--primary" id="toTest" type="button">Пройти быстрый тест</button>
          <button class="btn btn--ghost" id="backList" type="button">Назад к билетам</button>
        </div>
      </div>
    `;

    $('#toTest').addEventListener('click', () => {
      state.testStep = 0;
      state.testAnswers = {};
      state.testScore = 0;
      setScreen('test');
    });
    $('#backList').addEventListener('click', () => setScreen('ct_ticket'));

    $$('[data-openimg]').forEach(btn => {
      btn.addEventListener('click', () => {
        const src = btn.getAttribute('data-openimg');
        const title = btn.getAttribute('data-imgtitle');
        openModal(title || 'Картинка', `<img class="modal__img" src="${escapeHtml(src)}" alt="" />`);
      });
    });
  }

  function renderTopicView(){
    const subj = getSubject();
    const t = getTopic();
    if(!subj || !t){
      app.innerHTML = `<div class="note">Тема не найдена. Вернись назад.</div>`;
      return;
    }

    app.innerHTML = `
      ${breadcrumbs()}
      <div class="paper">
        <div class="paper__head">
          <div>
            <div class="paper__kicker">Школьные темы · ${escapeHtml(subj.name)}</div>
            <h2 class="paper__title">${escapeHtml(t.title)}</h2>
            <div class="paper__brief">${escapeHtml(t.brief)}</div>
          </div>
          <div class="paper__meta">
            ${(t.keywords || []).map(pill).join('')}
          </div>
        </div>

        <div class="meme">
          <div class="meme__img"><img src="${escapeHtml(t.memeImg)}" alt="" /></div>
          <div class="meme__txt">
            <div class="meme__cap"><b>Мем перед знаниями:</b> чтобы не заснуть 😄</div>
            <div class="meme__sub">Дальше — только важное.</div>
          </div>
        </div>

        <div class="paper__body">
          <div class="section2">
            <h3>Коротко по делу</h3>
            <div class="bullets">${t.short.map(x => `<div class="bullet">${x}</div>`).join('')}</div>
          </div>
          <div class="section2">
            <h3>Пример</h3>
            <div class="box">${t.exampleHtml}</div>
          </div>
          <div class="section2">
            <h3>Мини-тест</h3>
            <div class="note">В школьных темах — один этап (быстро и без страданий).</div>
          </div>
        </div>

        <div class="paper__actions">
          <button class="btn btn--primary" id="toTest" type="button">Пройти тест</button>
          <button class="btn btn--ghost" id="backList" type="button">Назад к темам</button>
        </div>
      </div>
    `;

    $('#toTest').addEventListener('click', () => {
      state.testStep = 0;
      state.testAnswers = {};
      state.testScore = 0;
      setScreen('test');
    });
    $('#backList').addEventListener('click', () => setScreen('subjects_topic'));
  }

  function getTestSpec(){
    if(state.mode === 'ct'){
      const t = getTicket();
      return t?.test || null;
    }
    const tp = getTopic();
    return tp?.test || null;
  }

  function calcScore(testSpec){
    let score = 0;
    const total = testSpec.steps.reduce((acc, s) => acc + (s.questions?.length || 0), 0);

    testSpec.steps.forEach((step, si) => {
      (step.questions || []).forEach((q, qi) => {
        const key = `${si}.${qi}`;
        const user = state.testAnswers[key];
        if(user === undefined) return;
        if(q.type === 'single'){
          if(Number(user) === q.answer) score++;
        } else if(q.type === 'order'){
          const arr = Array.isArray(user) ? user : [];
          const ok = JSON.stringify(arr) === JSON.stringify(q.answer);
          if(ok) score++;
        } else if(q.type === 'fill'){
          const v = String(user || '').trim().toLowerCase();
          if(v === String(q.answer).trim().toLowerCase()) score++;
        }
      });
    });

    return {score, total};
  }

  function renderTest(){
    const subj = getSubject();
    const testSpec = getTestSpec();
    if(!testSpec){
      app.innerHTML = `
        ${breadcrumbs()}
        <div class="note">Тест не найден. Проверь данные в <b>data.js</b>.</div>
      `;
      return;
    }

    const steps = testSpec.steps || [];
    const cur = steps[state.testStep] || null;

    if(!cur){
      const {score, total} = calcScore(testSpec);
      const pct = total ? Math.round((score/total)*100) : 0;
      app.innerHTML = `
        ${breadcrumbs()}
        <div class="paper">
          <div class="paper__head">
            <div>
              <div class="paper__kicker">Результат</div>
              <h2 class="paper__title">Готово! Ты набрал(а) <span class="u-blue">${score}/${total}</span></h2>
              <div class="paper__brief">Это примерно <b>${pct}%</b>. Если ниже 70% — просто повтори “ошибки” (они не кусаются).</div>
            </div>
            <div class="paper__meta">${subj ? pill(subj.name) : ''}</div>
          </div>

          <div class="section2">
            <h3>Ошибки и объяснения</h3>
            <div class="note">Нажимай “показать объяснение” только на тех, где ошибся — экономим время 😄</div>
            <div class="qa">
              ${steps.map((s, si) => (s.questions||[]).map((q, qi) => {
                const key = `${si}.${qi}`;
                const user = state.testAnswers[key];
                const ok = (q.type === 'single') ? Number(user) === q.answer
                  : (q.type === 'order') ? JSON.stringify(user||[]) === JSON.stringify(q.answer)
                  : (q.type === 'fill') ? String(user||'').trim().toLowerCase() === String(q.answer).trim().toLowerCase()
                  : false;

                if(ok) return '';
                const userText = user === undefined ? '—' : Array.isArray(user) ? user.join(' → ') : String(user);
                const rightText = q.type === 'single' ? q.options[q.answer]
                  : q.type === 'order' ? q.answer.join(' → ')
                  : q.type === 'fill' ? q.answer
                  : '';

                return `
                  <div class="qcard">
                    <div class="qcard__q"><b>Вопрос:</b> ${escapeHtml(q.q)}</div>
                    <div class="qcard__a"><b>Твой ответ:</b> ${escapeHtml(userText)}</div>
                    <div class="qcard__a"><b>Правильно:</b> ${escapeHtml(rightText)}</div>
                    <button class="link" type="button" data-explain="${si}.${qi}">Показать объяснение</button>
                    <div class="explain" id="ex_${si}_${qi}" hidden>${q.explain}</div>
                  </div>
                `;
              }).join('')).join('')}
            </div>
          </div>

          <div class="paper__actions">
            <button class="btn btn--primary" id="retry" type="button">Пройти тест ещё раз</button>
            <button class="btn btn--ghost" id="back" type="button">Назад к материалу</button>
          </div>
        </div>
      `;

      $$('[data-explain]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-explain');
          const el = document.getElementById(`ex_${id.replace('.', '_')}`);
          if(!el) return;
          el.hidden = !el.hidden;
          btn.textContent = el.hidden ? 'Показать объяснение' : 'Скрыть объяснение';
        });
      });

      $('#retry').addEventListener('click', () => {
        state.testStep = 0;
        state.testAnswers = {};
        setScreen('test');
      });

      $('#back').addEventListener('click', () => {
        if(state.mode === 'ct') setScreen('ticket_view'); else setScreen('topic_view');
      });

      return;
    }

    const stepIndex = state.testStep + 1;
    const stepCount = steps.length;

    const qHtml = (cur.questions || []).map((q, qi) => renderQuestion(q, state.testStep, qi)).join('');

    app.innerHTML = `
      ${breadcrumbs()}
      <div class="paper">
        <div class="paper__head">
          <div>
            <div class="paper__kicker">Тест · этап ${stepIndex}/${stepCount}</div>
            <h2 class="paper__title">${escapeHtml(cur.title || 'Этап')}</h2>
            <div class="paper__brief">${escapeHtml(cur.desc || 'Ответь быстро — и погнали дальше.')}</div>
          </div>
          <div class="paper__meta">
            ${pill('Без воды')}
            ${pill('Сразу проверка')}
          </div>
        </div>

        <div class="paper__body">
          <div class="progress">
            <div class="progress__bar" style="width:${Math.round(((stepIndex-1)/stepCount)*100)}%"></div>
          </div>
          <div class="qa">${qHtml}</div>
        </div>

        <div class="paper__actions">
          <button class="btn btn--primary" id="next" type="button">${state.testStep === stepCount-1 ? 'Завершить тест' : 'Дальше'}</button>
          <button class="btn btn--ghost" id="prev" type="button" ${state.testStep === 0 ? 'disabled' : ''}>Назад</button>
        </div>
      </div>
    `;

    wireQuestions(cur);

    $('#next').addEventListener('click', () => {
      state.testStep += 1;
      setScreen('test');
    });

    $('#prev').addEventListener('click', () => {
      state.testStep = Math.max(0, state.testStep - 1);
      setScreen('test');
    });
  }

  function renderQuestion(q, stepIdx, qIdx){
    const key = `${stepIdx}.${qIdx}`;
    const saved = state.testAnswers[key];

    if(q.type === 'single'){
      const opts = q.options.map((opt, oi) => {
        const checked = Number(saved) === oi ? 'checked' : '';
        return `
          <label class="opt">
            <input type="radio" name="q_${key}" value="${oi}" ${checked} />
            <span class="opt__txt">${escapeHtml(opt)}</span>
          </label>
        `;
      }).join('');

      return `
        <div class="qcard">
          <div class="qcard__q">${escapeHtml(q.q)}</div>
          <div class="qcard__opts" data-qkey="${key}" data-qtype="single">${opts}</div>
        </div>
      `;
    }

    if(q.type === 'order'){
      const current = Array.isArray(saved) ? saved : q.items.slice();
      const rows = current.map((it, idx) => `
        <div class="order__row" data-item="${escapeHtml(it)}">
          <div class="order__num">${idx+1}</div>
          <div class="order__txt">${escapeHtml(it)}</div>
          <div class="order__btns">
            <button class="iconbtn" type="button" data-up>↑</button>
            <button class="iconbtn" type="button" data-down>↓</button>
          </div>
        </div>
      `).join('');

      return `
        <div class="qcard">
          <div class="qcard__q">${escapeHtml(q.q)}</div>
          <div class="order" data-qkey="${key}" data-qtype="order">${rows}</div>
          <div class="hint">Подсказка: двигай строки стрелками.</div>
        </div>
      `;
    }

    if(q.type === 'fill'){
      const v = saved ? String(saved) : '';
      return `
        <div class="qcard">
          <div class="qcard__q">${escapeHtml(q.q)}</div>
          <input class="input" type="text" placeholder="Впиши ответ…" value="${escapeHtml(v)}" data-qkey="${key}" data-qtype="fill" />
          <div class="hint">Пиши коротко. Без лишних слов.</div>
        </div>
      `;
    }

    return `
      <div class="qcard">
        <div class="qcard__q">${escapeHtml(q.q)}</div>
        <div class="note">Неизвестный тип вопроса: <b>${escapeHtml(q.type)}</b></div>
      </div>
    `;
  }

  function wireQuestions(step){
    // single
    $$('[data-qtype="single"]').forEach(block => {
      const key = block.getAttribute('data-qkey');
      $$('input[type=radio]', block).forEach(r => {
        r.addEventListener('change', () => {
          state.testAnswers[key] = r.value;
        });
      });
    });

    // fill
    $$('[data-qtype="fill"]').forEach(input => {
      const key = input.getAttribute('data-qkey');
      input.addEventListener('input', () => {
        state.testAnswers[key] = input.value;
      });
    });

    // order
    $$('[data-qtype="order"]').forEach(box => {
      const key = box.getAttribute('data-qkey');

      function read(){
        const items = $$('.order__row', box).map(r => r.getAttribute('data-item'));
        state.testAnswers[key] = items;
      }

      function move(from, to){
        const rows = $$('.order__row', box);
        if(from < 0 || from >= rows.length) return;
        if(to < 0 || to >= rows.length) return;
        const a = rows[from];
        const b = rows[to];
        if(to > from) box.insertBefore(b, a);
        else box.insertBefore(a, b);
        // re-number
        $$('.order__row', box).forEach((r, i) => {
          $('.order__num', r).textContent = String(i+1);
        });
        read();
      }

      $$('.order__row', box).forEach((row, idx) => {
        $('[data-up]', row).addEventListener('click', () => move(idx, idx-1));
        $('[data-down]', row).addEventListener('click', () => move(idx, idx+1));
      });

      read();
    });
  }

  function render(){
    switch(state.screen){
      case 'home': return renderHome();
      case 'grade': return renderGrade();
      case 'mode': return renderMode();
      case 'ct_subject': return renderCtSubject();
      case 'ct_ticket': return renderCtTicketList();
      case 'ticket_view': return renderTicketView();
      case 'subjects_subject': return renderSubjectsSubject();
      case 'subjects_topic': return renderSubjectsTopicList();
      case 'topic_view': return renderTopicView();
      case 'test': return renderTest();
      default:
        app.innerHTML = `<div class="note">Неизвестный экран: ${escapeHtml(state.screen)}</div>`;
    }
  }

  // Topbar
  function bindTopbar(){
    homeBtn.addEventListener('click', () => { resetFlow(false); setScreen('home'); });
    homeBtn.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        resetFlow(false);
        setScreen('home');
      }
    });

    helpBtn.addEventListener('click', () => {
      openModal('Как это работает', `
        <ul class="list">
          <li><b>Выбираешь класс → режим → предмет</b>.</li>
          <li><b>Читаешь билет/тему</b> — только главное.</li>
          <li><b>Проходишь тест</b> — быстро, по этапам (в ЦТ).</li>
          <li><b>Смотришь ошибки</b> — и всё, ты красавчик/красотка 😄</li>
        </ul>
        <div class="note"><b>Лайфхак:</b> 2 прохода лучше 1 долгого. Быстро → тест → быстро повтор.</div>
      `);
    });

    modal.addEventListener('click', (e) => {
      const t = e.target;
      if(t && (t.matches('[data-close]') || t.matches('[data-overlay]'))){
        closeModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if(e.key === 'Escape') closeModal();
    });
  }

  bindTopbar();
  render();
})();
