(function () {
  "use strict";
  const D = window.CALISTENIA_DATA;
  const $app = document.getElementById("app");

  // ---------------------------------------------------------------------
  // Estado persistente (localStorage)
  // ---------------------------------------------------------------------
  const STORAGE_KEY = "calistenia_asiatica_state_v1";

  function defaultState() {
    return {
      onboarded: false,
      name: "",
      avatar: "",
      completedDays: [],
      bestStreak: 0,
      currentStreak: 0,
      lastCompletedDate: null,
      photos: [], // {dataUrl, date}
      savedRecipes: [],
      weightLog: [], // {date, weight}
      habitLog: {}, // "YYYY-MM-DD" -> {habitId: true}
      unlockedBadges: [],
    };
  }

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return Object.assign(defaultState(), JSON.parse(raw));
    } catch (e) {
      return defaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* localStorage lleno o bloqueado: seguimos sin persistir */
    }
  }

  // ---------------------------------------------------------------------
  // Navegacion (sin framework: un pequeño router por estado)
  // ---------------------------------------------------------------------
  const nav = { tab: "home", detail: null, modalDay: null };

  function go(tab) {
    nav.tab = tab;
    nav.detail = null;
    render();
    window.scrollTo(0, 0);
  }
  function openDetail(view, payload) {
    nav.detail = { view, payload };
    render();
    window.scrollTo(0, 0);
  }
  function closeDetail() {
    nav.detail = null;
    render();
    window.scrollTo(0, 0);
  }
  function openDayModal(day) {
    nav.modalDay = day;
    render();
  }
  function closeDayModal() {
    nav.modalDay = null;
    render();
  }

  // ---------------------------------------------------------------------
  // Helpers de dominio
  // ---------------------------------------------------------------------
  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }
  function daysBetween(a, b) {
    const d1 = new Date(a + "T00:00:00");
    const d2 = new Date(b + "T00:00:00");
    return Math.round((d2 - d1) / 86400000);
  }

  function isDayUnlocked(dayNum) {
    if (dayNum === 1) return true;
    return state.completedDays.includes(dayNum - 1);
  }
  function isDayDone(dayNum) {
    return state.completedDays.includes(dayNum);
  }

  function categoryOf(id) {
    return D.CATEGORIES.find((c) => c.id === id);
  }
  function phaseOf(id) {
    return D.PHASES.find((p) => p.id === id);
  }

  function completeDay(dayNum) {
    if (state.completedDays.includes(dayNum)) return;
    state.completedDays.push(dayNum);

    const today = todayISO();
    if (state.lastCompletedDate) {
      const gap = daysBetween(state.lastCompletedDate, today);
      if (gap === 0) {
        // ya entreno hoy, no cambia la racha
      } else if (gap === 1) {
        state.currentStreak += 1;
      } else {
        state.currentStreak = 1;
      }
    } else {
      state.currentStreak = 1;
    }
    state.lastCompletedDate = today;
    state.bestStreak = Math.max(state.bestStreak, state.currentStreak);

    checkBadges();
    saveState();
  }

  let pendingBadgeToast = null;
  function checkBadges() {
    for (const b of D.BADGES) {
      if (!state.unlockedBadges.includes(b.id) && b.check(state)) {
        state.unlockedBadges.push(b.id);
        pendingBadgeToast = b;
      }
    }
  }

  function progressPct() {
    return Math.round((state.completedDays.length / D.TOTAL_DAYS) * 100);
  }

  // ---------------------------------------------------------------------
  // Utilidades UI
  // ---------------------------------------------------------------------
  function el(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function showToast(msg) {
    const t = el(`<div class="toast">${escapeHtml(msg)}</div>`);
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }
  function resizeImageToDataUrl(file, maxSize, cb) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        cb(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ---------------------------------------------------------------------
  // Header (comun a todas las vistas salvo onboarding)
  // ---------------------------------------------------------------------
  function renderHeader() {
    const avatar = state.avatar
      ? `<img src="${state.avatar}" alt="">`
      : "\u{1F338}";
    return `
      <header class="hdr">
        <div class="hdr-greet">
          <div class="hdr-avatar">${avatar}</div>
          <div>
            <div class="hdr-name">Hola, ${escapeHtml(state.name || "")} \u{1F44B}</div>
            <div class="hdr-sub">Bienvenida de nuevo</div>
          </div>
        </div>
        <div class="hdr-actions">
          <div class="streak-pill">\u{1F525} ${state.currentStreak}</div>
        </div>
      </header>`;
  }

  const TABS = [
    { id: "home", icon: "\u{1F3E0}", label: "Home" },
    { id: "programa", icon: "\u{1F4C5}", label: "Programa" },
    { id: "plan", icon: "\u{1F4C4}", label: "Tu Plan" },
    { id: "info", icon: "\u{2139}\u{FE0F}", label: "Info" },
  ];
  function renderTabbar() {
    return `<nav class="tabbar">
      ${TABS.map(
        (t) => `<button class="tab ${nav.tab === t.id ? "active" : ""}" data-tab="${t.id}">
          <span class="tab-icon">${t.icon}</span>${t.label}
        </button>`
      ).join("")}
    </nav>`;
  }

  // ---------------------------------------------------------------------
  // Vista: Onboarding
  // ---------------------------------------------------------------------
  function renderOnboarding() {
    return `
      <div class="brand">
        <span class="brand-logo">CALISTENIA</span><span class="brand-badge">by Matt</span>
      </div>
      <div class="onboard">
        <div style="font-size:2.4rem;">\u{1F338}</div>
        <h1>¡Bienvenida a tu programa!</h1>
        <p>Antes de arrancar, contanos quién sos.</p>
        <div class="photo-picker" id="picker">
          <span id="picker-inner">\u{1F4F7}</span>
        </div>
        <input type="file" id="file-input" accept="image/*" style="display:none">
        <input type="text" class="text-input" id="name-input" placeholder="Ej: Ana" maxlength="30">
        <button class="btn-primary" id="onboard-continue" disabled>Continuar →</button>
      </div>`;
  }

  function wireOnboarding() {
    const picker = document.getElementById("picker");
    const fileInput = document.getElementById("file-input");
    const nameInput = document.getElementById("name-input");
    const continueBtn = document.getElementById("onboard-continue");
    let tempAvatar = "";

    picker.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const f = fileInput.files[0];
      if (!f) return;
      resizeImageToDataUrl(f, 300, (dataUrl) => {
        tempAvatar = dataUrl;
        document.getElementById("picker-inner").outerHTML = `<img src="${dataUrl}" alt="">`;
      });
    });
    nameInput.addEventListener("input", () => {
      continueBtn.disabled = nameInput.value.trim().length === 0;
    });
    continueBtn.addEventListener("click", () => {
      state.name = nameInput.value.trim();
      state.avatar = tempAvatar;
      state.onboarded = true;
      saveState();
      render();
    });
  }

  // ---------------------------------------------------------------------
  // Vista: Home
  // ---------------------------------------------------------------------
  function nextDay() {
    return D.PROGRAM_DAYS.find((d) => !isDayDone(d.day));
  }

  function renderHome() {
    const nd = nextDay();
    const pct = progressPct();
    const recentBadges = D.BADGES.filter((b) => state.unlockedBadges.includes(b.id)).slice(-3);
    let nextCard = "";
    if (nd) {
      const cat = categoryOf(nd.categoryId);
      const ph = phaseOf(nd.phaseId);
      nextCard = `
        <div class="card" id="next-day-card" data-day="${nd.day}">
          <div class="phase-tag">${escapeHtml(ph.name).toUpperCase()} · SEMANA ${nd.week}</div>
          <div style="display:flex;align-items:center;gap:.8rem;margin-top:.6rem;">
            <div style="font-size:2rem;">${cat.icon}</div>
            <div style="flex:1;">
              <div style="font-weight:800;font-size:1.02rem;">Día ${nd.day} · ${escapeHtml(cat.name)}</div>
              <div style="font-size:.78rem;color:var(--text-muted);">${escapeHtml(cat.focus)} · ${cat.minutes} min</div>
            </div>
          </div>
          <button class="btn-primary" style="margin-top:1rem;" id="start-next-day">Empezar rutina →</button>
        </div>`;
    } else {
      nextCard = `<div class="card" style="text-align:center;"><div style="font-size:2rem;">\u{1F3C6}</div><p style="margin-top:.5rem;font-weight:700;">¡Completaste todo el programa!</p><p style="font-size:.8rem;color:var(--text-muted);">Volvé a repetir tu fase favorita cuando quieras.</p></div>`;
    }

    return `
      ${renderHeader()}
      <main class="view">
        <h1 class="page-title">Tu progreso</h1>
        <p class="page-sub">Programa Calistenia Asiática · 63 días</p>
        <div class="card">
          <div style="display:flex;justify-content:space-between;font-size:.8rem;color:var(--text-muted);margin-bottom:.4rem;">
            <span>Progreso total</span><span style="font-weight:800;color:var(--primary-dark);">${pct}%</span>
          </div>
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
          <div style="font-size:.72rem;color:var(--text-muted);margin-top:.4rem;">${state.completedDays.length}/${D.TOTAL_DAYS} días completados</div>
        </div>

        <h1 class="page-title" style="margin-top:1.2rem;">Hoy te toca</h1>
        ${nextCard}

        ${
          recentBadges.length
            ? `<h1 class="page-title" style="margin-top:1.2rem;">Tus logros</h1>
               <div class="badges-grid">
                 ${recentBadges
                   .map(
                     (b) => `<div class="badge-item unlocked"><div class="badge-circle">${b.icon}</div><div class="badge-name">${escapeHtml(b.name)}</div></div>`
                   )
                   .join("")}
               </div>`
            : ""
        }

        <div class="card-flat">
          <div style="font-weight:700;font-size:.88rem;margin-bottom:.3rem;">\u{1F343} Frase del día</div>
          <div style="font-size:.85rem;color:var(--text);font-style:italic;">"La constancia serena vale más que la intensidad de un solo día."</div>
        </div>
      </main>
      ${renderTabbar()}`;
  }

  // ---------------------------------------------------------------------
  // Vista: Programa (63 dias)
  // ---------------------------------------------------------------------
  function renderPrograma() {
    const pct = progressPct();
    let phasesHtml = "";
    for (const phase of D.PHASES) {
      const phaseDays = D.PROGRAM_DAYS.filter((d) => d.phaseId === phase.id);
      const doneInPhase = phaseDays.filter((d) => isDayDone(d.day)).length;
      const phasePct = Math.round((doneInPhase / phaseDays.length) * 100);
      const status = doneInPhase === phaseDays.length ? "COMPLETADA" : doneInPhase > 0 ? "EN CURSO" : "PENDIENTE";

      let weeksHtml = "";
      for (const week of phase.weeks) {
        const weekDays = phaseDays.filter((d) => d.week === week);
        weeksHtml += `<div class="week-label">SEMANA ${week}</div>`;
        weeksHtml += weekDays
          .map((d) => {
            const cat = categoryOf(d.categoryId);
            const unlocked = isDayUnlocked(d.day);
            const done = isDayDone(d.day);
            const stateIcon = done ? "\u{2705}" : unlocked ? "\u{203A}" : "\u{1F512}";
            return `<div class="day-row ${!unlocked ? "locked" : ""} ${done ? "done" : ""}" ${unlocked ? `data-day="${d.day}"` : ""}>
              <div class="day-num">${d.day}</div>
              <div class="day-icon">${cat.icon}</div>
              <div class="day-info">
                <div class="day-name">${escapeHtml(cat.name)}</div>
                <div class="day-focus">${cat.minutes} min</div>
              </div>
              <div class="day-state">${stateIcon}</div>
            </div>`;
          })
          .join("");
      }

      phasesHtml += `
        <div class="phase-header">
          <span class="phase-tag">FASE ${phase.id}</span>
          <span class="phase-status">${status}</span>
        </div>
        <div class="phase-title">${escapeHtml(phase.name)}</div>
        <div class="phase-tagline">${escapeHtml(phase.tagline)}</div>
        <div class="phase-meta">Semanas ${phase.weeks[0]}-${phase.weeks[phase.weeks.length - 1]} · ${doneInPhase}/${phaseDays.length} días · ${phasePct}%</div>
        ${weeksHtml}`;
    }

    return `
      ${renderHeader()}
      <main class="view">
        <h1 class="page-title">Programa 63 Días</h1>
        <p class="page-sub">3 Fases · 9 Semanas · Transformación completa</p>
        <div class="card">
          <div style="font-size:.72rem;font-weight:800;color:var(--text-muted);letter-spacing:.05em;">PROGRESO TOTAL</div>
          <div style="font-size:1.6rem;font-weight:800;color:var(--primary-dark);margin:.2rem 0;">${pct}%</div>
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
          <div style="font-size:.72rem;color:var(--text-muted);margin-top:.4rem;">${state.completedDays.length}/${D.TOTAL_DAYS} días completados</div>
        </div>
        ${phasesHtml}
      </main>
      ${renderTabbar()}`;
  }

  // ---------------------------------------------------------------------
  // Vista: Tu Plan (bonos + logros + fotos)
  // ---------------------------------------------------------------------
  function renderPlan() {
    const bonusRows = D.BONUSES.map(
      (b, i) => `<div class="bonus-row" data-bonus="${b.view}">
        <div class="bonus-num">${i + 1}</div>
        <div style="flex:1;">
          <div class="bonus-kind">${escapeHtml(b.kind)}</div>
          <div class="bonus-title">${escapeHtml(b.title)}</div>
          <div class="bonus-desc">${escapeHtml(b.desc)}</div>
        </div>
        <div class="bonus-arrow">›</div>
      </div>`
    ).join("");

    const badgesHtml = D.BADGES.map((b) => {
      const unlocked = state.unlockedBadges.includes(b.id);
      return `<div class="badge-item ${unlocked ? "unlocked" : ""}" title="${escapeHtml(b.desc)}">
        <div class="badge-circle">${b.icon}</div>
        <div class="badge-name">${escapeHtml(b.name)}</div>
      </div>`;
    }).join("");

    const photosHtml = Array.from({ length: 6 })
      .map((_, i) => {
        const p = state.photos[i];
        return `<div class="photo-slot" ${!p ? 'data-add-photo="1"' : ""}>${p ? `<img src="${p.dataUrl}" alt="">` : "+"}</div>`;
      })
      .join("");

    return `
      ${renderHeader()}
      <main class="view">
        <div style="font-size:.68rem;font-weight:800;letter-spacing:.08em;color:var(--primary);">CONTENIDO PREMIUM</div>
        <h1 class="page-title">\u{1F381} Bonos Calistenia Asiática</h1>
        <p class="page-sub">Contenido exclusivo para tu transformación</p>

        <div class="card">
          <div style="font-weight:800;font-size:.88rem;margin-bottom:.6rem;">Tu progreso personal</div>
          <div class="badges-grid">${badgesHtml}</div>
        </div>

        <div class="card">
          <div style="display:flex;align-items:center;gap:.4rem;font-weight:800;font-size:.88rem;margin-bottom:.3rem;">\u{1F4F8} Fotos de progreso</div>
          <p style="font-size:.76rem;color:var(--text-muted);margin-bottom:.7rem;">Subí tus fotos de antes/después y mirá tu transformación.</p>
          <div class="photo-grid">${photosHtml}</div>
          <input type="file" id="photo-input" accept="image/*" style="display:none">
        </div>

        <div style="font-weight:800;font-size:.88rem;margin:1.1rem 0 .6rem;">Bonos incluidos</div>
        ${bonusRows}
      </main>
      ${renderTabbar()}`;
  }

  // ---------------------------------------------------------------------
  // Detalle: Recetas (Te Asiatico Anticelulite)
  // ---------------------------------------------------------------------
  let activeTag = "todas";
  let expandedRecipe = null;

  function renderRecetas() {
    const filtered = activeTag === "todas" ? D.RECIPES : D.RECIPES.filter((r) => r.tag === activeTag);
    const chips = [
      `<button class="tag-chip ${activeTag === "todas" ? "active" : ""}" data-tag="todas">Todas</button>`,
      ...Object.entries(D.RECIPE_TAGS).map(
        ([id, t]) => `<button class="tag-chip ${activeTag === id ? "active" : ""}" data-tag="${id}">${t.icon} ${escapeHtml(t.label)}</button>`
      ),
    ].join("");

    const cards = filtered
      .map((r) => {
        const tag = D.RECIPE_TAGS[r.tag];
        const isOpen = expandedRecipe === r.id;
        const isSaved = state.savedRecipes.includes(r.id);
        return `<div class="recipe-card">
          <div class="recipe-head" data-recipe="${r.id}">
            <div>
              <div class="recipe-name">${escapeHtml(r.name)}</div>
              <div class="recipe-tag">${tag.icon} ${escapeHtml(tag.label)}</div>
            </div>
            <div>${isOpen ? "▲" : "▼"}</div>
          </div>
          ${
            isOpen
              ? `<div class="recipe-body">
                  <h4>Ingredientes</h4>
                  <ul>${r.ingredients.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
                  <h4>Preparación</h4>
                  <p>${escapeHtml(r.preparation)}</p>
                  <div class="recipe-actions">
                    <button class="made" data-made="${r.id}">Hoy la preparo</button>
                    <button class="save ${isSaved ? "saved" : ""}" data-save="${r.id}">${isSaved ? "Guardada ✓" : "Guardar"}</button>
                  </div>
                </div>`
              : ""
          }
        </div>`;
      })
      .join("");

    return `
      <main class="view">
        <button class="btn-ghost" id="back-btn">‹ Volver</button>
        <h1 class="page-title">Té Asiático Anticelulite</h1>
        <p class="page-sub">Biblioteca de recetas interactiva</p>
        <div class="tag-scroll">${chips}</div>
        <p style="font-size:.78rem;color:var(--text-muted);margin-bottom:.8rem;">${filtered.length} recetas</p>
        ${cards}
      </main>`;
  }

  // ---------------------------------------------------------------------
  // Detalle: Plan de Progreso (peso)
  // ---------------------------------------------------------------------
  function renderPlanProgreso() {
    const entries = [...state.weightLog].sort((a, b) => (a.date < b.date ? 1 : -1));
    const rows = entries
      .map((e) => `<div class="simple-row"><span>${escapeHtml(e.date)}</span><strong>${e.weight} kg</strong></div>`)
      .join("");

    let sparkline = "";
    if (entries.length >= 2) {
      const asc = [...entries].reverse();
      const weights = asc.map((e) => e.weight);
      const min = Math.min(...weights), max = Math.max(...weights);
      const range = max - min || 1;
      const pts = asc
        .map((e, i) => {
          const x = (i / (asc.length - 1)) * 280 + 10;
          const y = 70 - ((e.weight - min) / range) * 60;
          return `${x},${y}`;
        })
        .join(" ");
      sparkline = `<svg viewBox="0 0 300 80" width="100%" height="80"><polyline points="${pts}" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }

    return `
      <main class="view">
        <button class="btn-ghost" id="back-btn">‹ Volver</button>
        <h1 class="page-title">Plan de Progreso</h1>
        <p class="page-sub">Registrá tu peso y mirá tu evolución</p>
        <div class="card">
          ${sparkline || '<p style="font-size:.8rem;color:var(--text-muted);">Cargá al menos 2 registros para ver tu gráfico.</p>'}
        </div>
        <div class="card">
          <div style="font-weight:800;font-size:.88rem;margin-bottom:.6rem;">Nuevo registro</div>
          <input type="number" step="0.1" class="text-input" id="weight-input" placeholder="Tu peso hoy (kg)" style="margin-bottom:.6rem;">
          <button class="btn-primary" id="save-weight">Guardar registro</button>
        </div>
        ${entries.length ? `<div class="card">${rows}</div>` : ""}
      </main>`;
  }

  // ---------------------------------------------------------------------
  // Detalle: Protocolo de Recuperacion y Alivio Articular
  // ---------------------------------------------------------------------
  const RECOVERY_ZONES = [
    { zone: "Rodillas sensibles", tip: "Antes de entrenar, hacé 10 círculos de rodilla hacia cada lado. Evitá sentadillas muy profundas los primeros días y priorizá amplitudes cortas y controladas." },
    { zone: "Espalda / lumbares", tip: "Activá el core antes de cualquier ejercicio de pie. Después de entrenar, hacé la postura del niño 1 minuto y estiramiento de gato-vaca." },
    { zone: "Hombros y cuello", tip: "Calentá con círculos de hombros 30 segundos en cada dirección antes de cualquier rutina de brazos. Si sentís tensión, sumá estiramiento cervical suave." },
    { zone: "Caderas", tip: "Las aperturas de cadera (hip openers) 5 minutos antes de entrenar piernas o glúteos previenen molestias y mejoran tu rango de movimiento." },
    { zone: "Días de mucho cansancio", tip: "Está bien reemplazar la rutina del día por 'Recuperación y Alivio Articular'. Escuchar tu cuerpo también es parte del método." },
  ];
  function renderRecuperacion() {
    return `
      <main class="view">
        <button class="btn-ghost" id="back-btn">‹ Volver</button>
        <h1 class="page-title">Recuperación y Alivio Articular</h1>
        <p class="page-sub">Recomendaciones según tu estado físico</p>
        ${RECOVERY_ZONES.map(
          (z) => `<div class="card">
            <div style="font-weight:800;font-size:.88rem;margin-bottom:.3rem;">${escapeHtml(z.zone)}</div>
            <div style="font-size:.82rem;color:var(--text);line-height:1.5;">${escapeHtml(z.tip)}</div>
          </div>`
        ).join("")}
      </main>`;
  }

  // ---------------------------------------------------------------------
  // Detalle: Tracker de Constancia
  // ---------------------------------------------------------------------
  const HABITS = [
    { id: "te", label: "Tomé mi té asiático" },
    { id: "entrene", label: "Entrené hoy" },
    { id: "agua", label: "Tomé suficiente agua" },
    { id: "sueno", label: "Dormí 7+ horas" },
  ];
  function renderTracker() {
    const today = todayISO();
    const todayLog = state.habitLog[today] || {};
    const habitRows = HABITS.map(
      (h) => `<label class="simple-row" style="cursor:pointer;">
        <span>${escapeHtml(h.label)}</span>
        <input type="checkbox" data-habit="${h.id}" ${todayLog[h.id] ? "checked" : ""}>
      </label>`
    ).join("");

    const recentDates = Object.keys(state.habitLog)
      .sort()
      .reverse()
      .slice(0, 7);
    const history = recentDates
      .map((date) => {
        const log = state.habitLog[date];
        const count = HABITS.filter((h) => log[h.id]).length;
        return `<div class="simple-row"><span>${escapeHtml(date)}</span><strong>${count}/${HABITS.length}</strong></div>`;
      })
      .join("");

    return `
      <main class="view">
        <button class="btn-ghost" id="back-btn">‹ Volver</button>
        <h1 class="page-title">Tracker de Constancia</h1>
        <p class="page-sub">Registro diario de hábitos · ${today}</p>
        <div class="card">${habitRows}</div>
        ${history ? `<div style="font-weight:800;font-size:.85rem;margin-bottom:.5rem;">Últimos días</div><div class="card">${history}</div>` : ""}
      </main>`;
  }

  // ---------------------------------------------------------------------
  // Detalle: Cronograma de Alimentacion Inteligente
  // ---------------------------------------------------------------------
  const MEAL_SCHEDULE = [
    { time: "Al despertar", tip: "Un vaso de agua tibia con limón. Activa tu digestión antes de la primera comida." },
    { time: "Desayuno (dentro de la primera hora)", tip: "Proteína + grasas buenas (huevo, palta, yogur natural). Evitá el azúcar refinada apenas te levantás." },
    { time: "30 min antes de entrenar", tip: "Un té termogénico de la biblioteca (jengibre o canela) para llegar con más energía." },
    { time: "Después de entrenar (30-45 min)", tip: "Proteína + carbohidrato de calidad para recuperar (por ejemplo yogur con fruta, o pollo con arroz)." },
    { time: "Almuerzo", tip: "Mitad del plato en vegetales, un cuarto en proteína, un cuarto en carbohidratos complejos." },
    { time: "Media tarde", tip: "Si tenés hambre, priorizá fruta o frutos secos antes que ultraprocesados." },
    { time: "Cena (al menos 2-3h antes de dormir)", tip: "Liviana, con proteína y vegetales. Evitá comidas muy pesadas cerca de acostarte." },
  ];
  function renderAlimentacion() {
    return `
      <main class="view">
        <button class="btn-ghost" id="back-btn">‹ Volver</button>
        <h1 class="page-title">Alimentación Inteligente</h1>
        <p class="page-sub">Horarios y combinaciones para acelerar tu metabolismo</p>
        ${MEAL_SCHEDULE.map(
          (m, i) => `<div class="card">
            <div style="font-weight:800;font-size:.85rem;margin-bottom:.3rem;">${i + 1}. ${escapeHtml(m.time)}</div>
            <div style="font-size:.82rem;color:var(--text);line-height:1.5;">${escapeHtml(m.tip)}</div>
          </div>`
        ).join("")}
      </main>`;
  }

  // ---------------------------------------------------------------------
  // Detalle: Protocolo Reinicio 72H
  // ---------------------------------------------------------------------
  const RESET_DAYS = [
    { day: 1, title: "Desintoxicación suave", tasks: ["Eliminá azúcar refinada y ultraprocesados por hoy", "3 litros de agua distribuidos en el día", "Dormí 30 minutos antes de tu horario habitual", "Rutina de hoy: Recuperación y Alivio Articular"] },
    { day: 2, title: "Reactivación", tasks: ["Desayuno con proteína dentro de la primera hora", "Un té termogénico antes de entrenar", "Rutina de hoy: Activación Total", "10 minutos de sol directo (vitamina D natural)"] },
    { day: 3, title: "Consolidación", tasks: ["Mantené los horarios de comida del cronograma", "Anotá cómo te sentís en el Tracker de Constancia", "Rutina de hoy: la que corresponda en tu programa", "Sacate una foto de progreso"] },
  ];
  function renderReinicio() {
    return `
      <main class="view">
        <button class="btn-ghost" id="back-btn">‹ Volver</button>
        <h1 class="page-title">Protocolo Reinicio 72H</h1>
        <p class="page-sub">Reset hormonal y de descanso en 3 días</p>
        ${RESET_DAYS.map(
          (d) => `<div class="card">
            <div class="phase-tag">DÍA ${d.day}</div>
            <div style="font-weight:800;font-size:.95rem;margin:.4rem 0 .6rem;">${escapeHtml(d.title)}</div>
            <ul style="list-style:none;">
              ${d.tasks.map((t) => `<li style="font-size:.82rem;padding:.25rem 0;">✓ ${escapeHtml(t)}</li>`).join("")}
            </ul>
          </div>`
        ).join("")}
      </main>`;
  }

  const DETAIL_RENDERERS = {
    recetas: renderRecetas,
    "plan-progreso": renderPlanProgreso,
    recuperacion: renderRecuperacion,
    tracker: renderTracker,
    alimentacion: renderAlimentacion,
    reinicio: renderReinicio,
  };

  // ---------------------------------------------------------------------
  // Vista: Info
  // ---------------------------------------------------------------------
  let installPlatform = "iphone";
  function renderInfo() {
    return `
      ${renderHeader()}
      <main class="view">
        <h1 class="page-title">Info</h1>
        <p class="page-sub">Todo lo que necesitás saber sobre tu programa</p>

        <div class="info-block">
          <h3>¿Qué es Calistenia Asiática?</h3>
          <p>Un programa de 63 días diseñado para activar tus fibras profundas, tonificar tu cuerpo y ganar disciplina serena, entrenando con tu propio peso, sin gimnasio y sin excusas.</p>
        </div>

        <div class="info-block">
          <h3>¿Cómo uso el programa?</h3>
          <p>Cada día tiene un video de entrenamiento con una instructora real. Mirá el video, hacé la rutina y marcala como completada. Al completar un día se desbloquea el siguiente. Los 7 videos se repiten cada semana, en 3 fases con intensidad narrativa progresiva.</p>
        </div>

        <div class="info-block">
          <h3>Recomendaciones</h3>
          <ul>
            <li>Entrená a la misma hora todos los días</li>
            <li>Usá ropa cómoda y un espacio libre</li>
            <li>Hidratate antes, durante y después</li>
            <li>Descansá al menos 7 horas por noche</li>
            <li>La constancia serena es más poderosa que la intensidad de un día</li>
            <li>Escuchá tu cuerpo, nunca fuerces al dolor</li>
          </ul>
        </div>

        <div class="info-block">
          <h3>¿Qué necesito?</h3>
          <p>Solo tu cuerpo, un espacio libre (tu casa, un parque, donde sea) y compromiso. No se necesitan pesas, bandas ni equipo especial.</p>
        </div>

        <div class="info-block">
          <h3>Soporte</h3>
          <p>¿Tenés dudas o necesitás ayuda? Escribinos, respondemos todos los días.</p>
          <button class="btn-secondary" style="margin-top:.6rem;">Contactar soporte</button>
        </div>

        <div class="info-block">
          <h3>Invitá a una amiga</h3>
          <p>¿Conocés a alguien que necesite este empujón? Mandale el link.</p>
          <button class="btn-secondary" style="margin-top:.6rem;" id="share-link">\u{1F465} Invitar a una amiga</button>
        </div>

        <div class="info-block">
          <h3>Instalá la app en tu celular</h3>
          <p>Accedé más rápido sin buscar el link cada vez. Se ve y funciona como una app real.</p>
          <div class="card-flat" style="margin-top:.6rem;">
            <div style="font-size:.78rem;"><strong>Tip:</strong> instalala ANTES de completar tu nombre, así tu progreso queda guardado ahí directamente.</div>
          </div>
          <div class="platform-toggle" style="margin-top:1rem;">
            <button class="${installPlatform === "iphone" ? "active" : ""}" data-platform="iphone">\u{1F4F1} iPhone</button>
            <button class="${installPlatform === "android" ? "active" : ""}" data-platform="android">\u{1F916} Android</button>
          </div>
          ${
            installPlatform === "iphone"
              ? `<div class="install-step"><div class="n">1</div><div><div class="t">Abrí esta página en Safari</div><div class="d">No funciona desde Chrome ni otros navegadores</div></div></div>
                 <div class="install-step"><div class="n">2</div><div><div class="t">Tocá el botón Compartir</div><div class="d">Es el ícono del centro abajo de la pantalla</div></div></div>
                 <div class="install-step"><div class="n">3</div><div><div class="t">Tocá "Agregar a Inicio"</div><div class="d">Bajá en el menú hasta encontrar esa opción</div></div></div>
                 <div class="install-step"><div class="n">4</div><div><div class="t">Tocá Agregar arriba a la derecha</div><div class="d">Listo, ya tenés el ícono en tu pantalla de inicio</div></div></div>`
              : `<div class="install-step"><div class="n">1</div><div><div class="t">Abrí esta página en Chrome</div><div class="d">Es el navegador que mejor soporta la instalación</div></div></div>
                 <div class="install-step"><div class="n">2</div><div><div class="t">Tocá el menú (⋮) arriba a la derecha</div><div class="d">Se abre una lista de opciones</div></div></div>
                 <div class="install-step"><div class="n">3</div><div><div class="t">Tocá "Instalar app" o "Agregar a pantalla de inicio"</div><div class="d">Puede aparecer con cualquiera de los dos nombres</div></div></div>
                 <div class="install-step"><div class="n">4</div><div><div class="t">Confirmá tocando "Instalar"</div><div class="d">Listo, ya tenés el ícono en tu pantalla de inicio</div></div></div>`
          }
        </div>

        <div class="quote-block">"La disciplina serena es el puente entre tus metas y tus resultados."</div>
        <div class="footer-note">Calistenia Asiática. Uso personal exclusivo.</div>
      </main>
      ${renderTabbar()}`;
  }

  // ---------------------------------------------------------------------
  // Modal: video del dia
  // ---------------------------------------------------------------------
  function renderDayModal() {
    if (nav.modalDay == null) return "";
    const d = D.PROGRAM_DAYS.find((x) => x.day === nav.modalDay);
    const cat = categoryOf(d.categoryId);
    const done = isDayDone(d.day);
    const thumb = `https://img.youtube.com/vi/${cat.youtubeId}/hqdefault.jpg`;
    const url = `https://www.youtube.com/watch?v=${cat.youtubeId}`;

    return `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal-sheet">
          <button class="modal-close" id="modal-close">✕</button>
          <div class="phase-tag">DÍA ${d.day} · ${cat.minutes} min</div>
          <h1 class="page-title" style="margin-top:.5rem;">${escapeHtml(cat.name)}</h1>
          <div class="video-thumb" id="video-open" data-url="${url}">
            <img src="${thumb}" alt="">
            <div class="video-play"><span>▶</span></div>
          </div>
          <div class="video-instructor">Con ${escapeHtml(cat.instructor)} · se abre en YouTube</div>
          <a class="btn-secondary" href="${url}" target="_blank" rel="noopener noreferrer" style="margin-bottom:.6rem;">↗ Abrir en YouTube</a>
          <button class="btn-primary" id="mark-complete" data-day="${d.day}" ${done ? "disabled" : ""}>${done ? "Completado ✓" : "Marcar como completado"}</button>
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------------
  // Render principal + wiring de eventos
  // ---------------------------------------------------------------------
  function render() {
    if (!state.onboarded) {
      $app.innerHTML = renderOnboarding();
      wireOnboarding();
      return;
    }

    let html;
    if (nav.detail) {
      html = DETAIL_RENDERERS[nav.detail.view]();
    } else if (nav.tab === "home") html = renderHome();
    else if (nav.tab === "programa") html = renderPrograma();
    else if (nav.tab === "plan") html = renderPlan();
    else if (nav.tab === "info") html = renderInfo();
    else html = renderHome();

    $app.innerHTML = html + renderDayModal();
    wireEvents();

    if (pendingBadgeToast) {
      showToast(`${pendingBadgeToast.icon} ¡Nuevo logro! ${pendingBadgeToast.name}`);
      pendingBadgeToast = null;
    }
  }

  function wireEvents() {
    // Tabbar
    $app.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => go(b.dataset.tab)));

    // Back button en detalle
    const back = document.getElementById("back-btn");
    if (back) back.addEventListener("click", closeDetail);

    // Home: abrir dia siguiente
    const startNext = document.getElementById("start-next-day");
    if (startNext) startNext.addEventListener("click", () => openDayModal(Number(document.getElementById("next-day-card").dataset.day)));
    const nextCard = document.getElementById("next-day-card");
    if (nextCard) nextCard.addEventListener("click", (e) => { if (e.target.id !== "start-next-day") openDayModal(Number(nextCard.dataset.day)); });

    // Programa: filas de dia
    $app.querySelectorAll(".day-row[data-day]").forEach((row) => row.addEventListener("click", () => openDayModal(Number(row.dataset.day))));

    // Modal
    const overlay = document.getElementById("modal-overlay");
    const modalClose = document.getElementById("modal-close");
    if (modalClose) modalClose.addEventListener("click", closeDayModal);
    if (overlay) overlay.addEventListener("click", (e) => { if (e.target === overlay) closeDayModal(); });
    const videoOpen = document.getElementById("video-open");
    if (videoOpen) videoOpen.addEventListener("click", () => window.open(videoOpen.dataset.url, "_blank", "noopener"));
    const markComplete = document.getElementById("mark-complete");
    if (markComplete) markComplete.addEventListener("click", () => { completeDay(Number(markComplete.dataset.day)); closeDayModal(); });

    // Tu Plan: bonos
    $app.querySelectorAll("[data-bonus]").forEach((row) => row.addEventListener("click", () => openDetail(row.dataset.bonus)));

    // Tu Plan: fotos
    const photoInput = document.getElementById("photo-input");
    $app.querySelectorAll("[data-add-photo]").forEach((slot) =>
      slot.addEventListener("click", () => photoInput && photoInput.click())
    );
    if (photoInput) {
      photoInput.addEventListener("change", () => {
        const f = photoInput.files[0];
        if (!f) return;
        resizeImageToDataUrl(f, 700, (dataUrl) => {
          state.photos.push({ dataUrl, date: todayISO() });
          checkBadges();
          saveState();
          render();
        });
      });
    }

    // Compartir link
    const shareBtn = document.getElementById("share-link");
    if (shareBtn) {
      shareBtn.addEventListener("click", () => {
        const url = window.location.origin;
        if (navigator.share) {
          navigator.share({ title: "Calistenia Asiática", url }).catch(() => {});
        } else {
          navigator.clipboard?.writeText(url);
          showToast("Link copiado \u{1F4CB}");
        }
      });
    }

    // Info: toggle plataforma instalacion
    $app.querySelectorAll("[data-platform]").forEach((b) =>
      b.addEventListener("click", () => { installPlatform = b.dataset.platform; render(); go("info"); })
    );

    // Recetas
    $app.querySelectorAll("[data-tag]").forEach((chip) =>
      chip.addEventListener("click", () => { activeTag = chip.dataset.tag; openDetail("recetas"); })
    );
    $app.querySelectorAll("[data-recipe]").forEach((h) =>
      h.addEventListener("click", () => { expandedRecipe = expandedRecipe === h.dataset.recipe ? null : h.dataset.recipe; openDetail("recetas"); })
    );
    $app.querySelectorAll("[data-save]").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.save;
        const idx = state.savedRecipes.indexOf(id);
        if (idx >= 0) state.savedRecipes.splice(idx, 1);
        else state.savedRecipes.push(id);
        saveState();
        openDetail("recetas");
      })
    );
    $app.querySelectorAll("[data-made]").forEach((btn) =>
      btn.addEventListener("click", (e) => { e.stopPropagation(); showToast("¡Buen provecho! \u{1F375}"); })
    );

    // Plan de progreso: peso
    const saveWeight = document.getElementById("save-weight");
    if (saveWeight) {
      saveWeight.addEventListener("click", () => {
        const input = document.getElementById("weight-input");
        const val = parseFloat(input.value);
        if (!val || val <= 0) return;
        state.weightLog.push({ date: todayISO(), weight: val });
        saveState();
        openDetail("plan-progreso");
      });
    }

    // Tracker de constancia
    $app.querySelectorAll("[data-habit]").forEach((cb) =>
      cb.addEventListener("change", () => {
        const today = todayISO();
        if (!state.habitLog[today]) state.habitLog[today] = {};
        state.habitLog[today][cb.dataset.habit] = cb.checked;
        saveState();
      })
    );
  }

  render();
})();
