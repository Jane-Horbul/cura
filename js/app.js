// Cura — main application controller

const App = {
  data: {
    name:     '',
    gender:   null,
    age:      null,
    weight:   null,
    height:   null,
    activity: null,
    goal:     null,
  },
  result:           null,
  _savedToFamily:   false,  // true after saving current calc to family
  _viewingMemberId: null,   // id of family member being viewed (null = own plan)

  // ── Navigation ─────────────────────────────────────────────
  go(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    window.scrollTo(0, 0);
    const leftPanel = document.querySelector('.results-left');
    if (leftPanel) leftPanel.scrollTop = 0;
  },

  // ── Form: gender ───────────────────────────────────────────
  selectGender(value, btn) {
    this.data.gender = value;
    document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    document.getElementById('cycle-block').style.display = value === 'female' ? 'block' : 'none';
    document.getElementById('next-1').disabled = false;
  },

  // ── Form: goal ─────────────────────────────────────────────
  selectGoal(value, btn) {
    this.data.goal = value;
    document.querySelectorAll('.goal-card').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('next-4').disabled = false;
  },

  // ── Enable step-2 button when all inputs filled ────────────
  checkStep2() {
    const age    = +document.getElementById('age').value;
    const weight = +document.getElementById('weight').value;
    const height = +document.getElementById('height').value;
    const ok = age >= 2 && age <= 100 && weight >= 5 && weight <= 300 && height >= 50 && height <= 250;
    document.getElementById('next-2').disabled = !ok;
  },

  // ── Enable step-3 button when activity selected ────────────
  checkStep3() {
    const checked = document.querySelector('input[name="activity"]:checked');
    document.getElementById('next-3').disabled = !checked;
  },

  // ── Step navigation ────────────────────────────────────────
  nextStep(current) {
    if (!this._validateStep(current)) return;

    // Hide current step
    document.getElementById(`step-${current}`).classList.remove('active');

    // Advance step indicator
    document.querySelectorAll('.step')[current - 1].classList.remove('active');
    document.querySelectorAll('.step')[current - 1].classList.add('done');
    document.querySelectorAll('.step')[current].classList.add('active');

    // Show next step
    document.getElementById(`step-${current + 1}`).classList.add('active');
  },

  prevStep(current) {
    document.getElementById(`step-${current}`).classList.remove('active');
    document.querySelectorAll('.step')[current - 1].classList.remove('active');
    document.querySelectorAll('.step')[current - 2].classList.remove('done');
    document.querySelectorAll('.step')[current - 2].classList.add('active');
    document.getElementById(`step-${current - 1}`).classList.add('active');
  },

  _validateStep(step) {
    if (step === 1) {
      if (!this.data.gender) {
        alert('Оберіть стать, будь ласка.');
        return false;
      }
    }
    if (step === 2) {
      const age    = +document.getElementById('age').value;
      const weight = +document.getElementById('weight').value;
      const height = +document.getElementById('height').value;
      if (!age || age < 2 || age > 100)         { alert('Вкажіть коректний вік (2–100 років).'); return false; }
      if (!weight || weight < 5 || weight > 300) { alert('Вкажіть коректну вагу (5–300 кг).'); return false; }
      if (!height || height < 50 || height > 250) { alert('Вкажіть коректний зріст (50–250 см).'); return false; }
      this.data.age    = age;
      this.data.weight = weight;
      this.data.height = height;
    }
    if (step === 3) {
      const checked = document.querySelector('input[name="activity"]:checked');
      if (!checked) { alert('Оберіть рівень активності.'); return false; }
      this.data.activity = checked.value;
    }
    return true;
  },

  // ── Calculate & show results ───────────────────────────────
  async calculate() {
    if (!this.data.goal) { alert('Оберіть мету.'); return; }

    this.data.name = document.getElementById('member-name').value.trim() || 'Я';

    const cycleBonus = this.data.gender === 'female'
      && document.getElementById('cycle-toggle').checked;

    this.result = Calculator.calculate({ ...this.data, cycleBonus });
    this._savedToFamily   = false;
    this._viewingMemberId = null;

    // Update left panel
    document.getElementById('kcal-display').textContent    = `${this.result.kcal} ккал`;
    document.getElementById('protein-display').textContent = this.result.protein;
    document.getElementById('fat-display').textContent     = this.result.fat;
    document.getElementById('carbs-display').textContent   = this.result.carbs;
    document.getElementById('summary-member-label').textContent = 'Твоя добова норма';
    this._updateProfileStrip(this.data);

    // Fill inline results block
    document.getElementById('ri-kcal').textContent    = `${this.result.kcal} ккал`;
    document.getElementById('ri-protein').textContent = this.result.protein;
    document.getElementById('ri-fat').textContent     = this.result.fat;
    document.getElementById('ri-carbs').textContent   = this.result.carbs;
    this._fillRiProfile(this.data);
    document.getElementById('results-inline').style.display = 'block';
    document.getElementById('results-inline').scrollIntoView({ behavior: 'smooth' });

    // Prepare full plan screen and load meals
    this._renderResultsFamilyPanel();
    this.loadMeals();

    // Auto-save if logged in
    if (Auth.isLoggedIn()) {
      Auth.saveProfile({
        memberName: this.data.name,
        gender:     this.data.gender,
        age:        this.data.age,
        weight:     this.data.weight,
        height:     this.data.height,
        activity:   this.data.activity,
        goal:       this.data.goal,
        result:     this.result,
      });
    }
  },

  // ── Load meals from Spoonacular ────────────────────────────
  async loadMeals() {
    const output = document.getElementById('plan-output');
    const btn = document.getElementById('btn-refresh-meals');
    if (btn) btn.disabled = true;

    output.innerHTML = `
      <div style="text-align:center;padding:40px;color:#888">
        <div style="font-size:2rem">🍽️</div>
        <div>Підбираємо рецепти...</div>
      </div>`;

    try {
      const r = await fetch(`/api/meals?calories=${this.result.kcal}`);
      const data = await r.json();
      if (!r.ok || !data.meals) throw new Error();
      this._renderSpoonMeals(data.meals);
    } catch {
      // Fallback to static
      this.showPlan(0, document.querySelector('.plan-tab'));
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  // ── Render Spoonacular meals ───────────────────────────────
  _renderSpoonMeals(meals) {
    const mealTypes = [
      { key: 'breakfast', label: 'Сніданок', icon: '🌅' },
      { key: 'lunch',     label: 'Обід',     icon: '☀️' },
      { key: 'dinner',    label: 'Вечеря',   icon: '🌙' },
    ];

    let totalKcal = 0, totalP = 0, totalF = 0, totalC = 0;

    const cardsHTML = mealTypes.map(({ key, label, icon }) => {
      const meal = meals[key];
      if (!meal) return '';

      totalKcal += meal.kbju.kcal;
      totalP    += meal.kbju.protein;
      totalF    += meal.kbju.fat;
      totalC    += meal.kbju.carbs;

      const ingredients = meal.ingredients.map(i =>
        `<li><span>${this._esc(i.name)}</span><span class="ing-amount">${i.amount} ${this._esc(i.unit)}</span></li>`
      ).join('');

      const steps = meal.steps.map((s, i) =>
        `<li><span class="step-num">${i + 1}</span><span>${this._esc(s)}</span></li>`
      ).join('');

      const cardId = `spoon-${key}`;

      return `
        <div class="meal-card" id="${cardId}">
          <div class="meal-header" onclick="App.toggleMeal('${cardId}')">
            <div class="meal-header-left">
              <div>
                <div class="meal-type-badge">${icon} ${label}</div>
                <div class="meal-name">${this._esc(meal.name)}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:12px">
              <span class="meal-kcal">${meal.kbju.kcal} ккал</span>
              <span class="meal-arrow">▼</span>
            </div>
          </div>
          <div class="meal-body">
            <div class="meal-meta">
              <span>⏱ ${this._esc(meal.time)}</span>
              ${meal.sourceUrl ? `<a href="${meal.sourceUrl}" target="_blank" style="font-size:0.8rem;color:#6b8f71">Джерело →</a>` : ''}
            </div>
            <div class="section-title">Інгредієнти</div>
            <ul class="ingredients">${ingredients}</ul>
            <div class="section-title">Приготування</div>
            <ol class="recipe-steps">${steps}</ol>
            <div class="macro-mini">
              <div class="macro-mini-item"><div class="val">${meal.kbju.protein}г</div><div class="lbl">Білки</div></div>
              <div class="macro-mini-item"><div class="val">${meal.kbju.fat}г</div><div class="lbl">Жири</div></div>
              <div class="macro-mini-item"><div class="val">${meal.kbju.carbs}г</div><div class="lbl">Вуглеводи</div></div>
            </div>
          </div>
        </div>`;
    }).join('');

    const totalHTML = `
      <div class="day-total">
        <strong>📊 Разом за день</strong>
        <div class="day-total-nums">
          <span><strong>${totalKcal}</strong> ккал</span>
          <span>Б: <strong>${totalP}г</strong></span>
          <span>Ж: <strong>${totalF}г</strong></span>
          <span>В: <strong>${totalC}г</strong></span>
        </div>
      </div>`;

    document.getElementById('plan-output').innerHTML = cardsHTML + totalHTML;
    this.toggleMeal('spoon-breakfast');
  },

  // ── Render a meal plan ─────────────────────────────────────
  showPlan(index, tab) {
    // Update active tab
    document.querySelectorAll('.plan-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const plan  = MEAL_PLANS[index];
    const kcal  = this.result.kcal;
    const split = Calculator.MEAL_SPLIT;

    const mealTypes = [
      { key: 'breakfast', label: 'Сніданок',  icon: '🌅', ratio: split.breakfast },
      { key: 'lunch',     label: 'Обід',      icon: '☀️',  ratio: split.lunch     },
      { key: 'snack',     label: 'Перекус',   icon: '🍃',  ratio: split.snack     },
      { key: 'dinner',    label: 'Вечеря',    icon: '🌙',  ratio: split.dinner    },
    ];

    let totalKcal = 0, totalP = 0, totalF = 0, totalC = 0;

    const cardsHTML = mealTypes.map(({ key, label, icon, ratio }) => {
      const meal    = Calculator.scaleMeal(plan.meals[key], kcal * ratio);
      totalKcal    += meal.kbju.kcal;
      totalP       += meal.kbju.protein;
      totalF       += meal.kbju.fat;
      totalC       += meal.kbju.carbs;

      const ingredients = meal.ingredients.map(i =>
        `<li>
          <span>${this._esc(i.name)}</span>
          <span class="ing-amount">${i.amount} ${this._esc(i.unit)}</span>
        </li>`
      ).join('');

      const steps = meal.steps.map((s, i) =>
        `<li><span class="step-num">${i + 1}</span><span>${this._esc(s)}</span></li>`
      ).join('');

      const cardId = `meal-${key}-${index}`;

      return `
        <div class="meal-card" id="${cardId}">
          <div class="meal-header" onclick="App.toggleMeal('${cardId}')">
            <div class="meal-header-left">
              <div>
                <div class="meal-type-badge">${icon} ${label}</div>
                <div class="meal-name">${this._esc(meal.name)}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:12px">
              <span class="meal-kcal">${meal.kbju.kcal} ккал</span>
              <span class="meal-arrow">▼</span>
            </div>
          </div>
          <div class="meal-body">
            <div class="meal-meta">
              <span>🍳 ${this._esc(meal.method)}</span>
              <span>⏱ ${this._esc(meal.time)}</span>
            </div>

            <div class="section-title">Інгредієнти</div>
            <ul class="ingredients">${ingredients}</ul>

            <div class="section-title">Приготування</div>
            <ol class="recipe-steps">${steps}</ol>

            <div class="macro-mini">
              <div class="macro-mini-item">
                <div class="val">${meal.kbju.protein}г</div>
                <div class="lbl">Білки</div>
              </div>
              <div class="macro-mini-item">
                <div class="val">${meal.kbju.fat}г</div>
                <div class="lbl">Жири</div>
              </div>
              <div class="macro-mini-item">
                <div class="val">${meal.kbju.carbs}г</div>
                <div class="lbl">Вуглеводи</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const totalHTML = `
      <div class="day-total">
        <strong>📊 Разом за день</strong>
        <div class="day-total-nums">
          <span><strong>${totalKcal}</strong> ккал</span>
          <span>Б: <strong>${totalP}г</strong></span>
          <span>Ж: <strong>${totalF}г</strong></span>
          <span>В: <strong>${totalC}г</strong></span>
        </div>
      </div>
    `;

    document.getElementById('plan-output').innerHTML = cardsHTML + totalHTML;

    // Auto-open first meal
    this.toggleMeal(`meal-breakfast-${index}`);
  },

  toggleMeal(id) {
    document.getElementById(id).classList.toggle('open');
  },

  // ── Fill profile in inline results block ─────────────────
  _fillRiProfile(data) {
    const activityLabels = {
      sedentary: 'Мін. активність', light: 'Легка активність',
      moderate: 'Середня активність', active: 'Висока активність', veryActive: 'Дуже висока',
    };
    const goalLabels = { lose: '📉 Схуднення', maintain: '⚖️ Підтримка', gain: '📈 Набір маси' };
    const genderIcon = data.gender === 'female' ? '♀' : data.gender === 'male' ? '♂' : null;
    const chips = [
      data.name && data.name !== 'Я' ? `👤 ${data.name}` : null,
      genderIcon,
      data.age    ? `${data.age} р.`              : null,
      data.weight ? `${data.weight} кг`           : null,
      data.height ? `${data.height} см`           : null,
      data.activity ? activityLabels[data.activity] : null,
      data.goal     ? goalLabels[data.goal]         : null,
    ].filter(Boolean);
    const el = document.getElementById('ri-profile');
    if (el) el.innerHTML = chips.map(c => `<span class="profile-chip">${this._esc(c)}</span>`).join('');
  },

  // ── Fill profile strip in summary card ───────────────────
  _updateProfileStrip(data) {
    const activityLabels = {
      sedentary:  'Мін. активність',
      light:      'Легка активність',
      moderate:   'Середня активність',
      active:     'Висока активність',
      veryActive: 'Дуже висока',
    };
    const goalLabels = { lose: '📉 Схуднення', maintain: '⚖️ Підтримка', gain: '📈 Набір маси' };
    const genderIcon = data.gender === 'female' ? '♀' : data.gender === 'male' ? '♂' : null;

    const chips = [
      data.name && data.name !== 'Я' ? `👤 ${data.name}` : null,
      genderIcon,
      data.age    ? `${data.age} р.`               : null,
      data.weight ? `${data.weight} кг`            : null,
      data.height ? `${data.height} см`            : null,
      data.activity ? activityLabels[data.activity] : null,
      data.goal     ? goalLabels[data.goal]         : null,
    ].filter(Boolean);

    const el = document.getElementById('profile-strip');
    if (el) el.innerHTML = chips.map(c => `<span class="profile-chip">${this._esc(c)}</span>`).join('');
  },

  // ── Auth: init on page load ───────────────────────────────
  async init() {
    Auth.updateUI();
    if (!Auth.isLoggedIn()) return;
    const profile = await Auth.loadProfile();
    if (profile && profile.result) {
      this._applyProfile(profile);
    }
  },

  _applyProfile(profile) {
    this.data = {
      name:     profile.memberName || Auth.getName() || 'Я',
      gender:   profile.gender,
      age:      profile.age,
      weight:   profile.weight,
      height:   profile.height,
      activity: profile.activity,
      goal:     profile.goal,
    };
    this.result = typeof profile.result === 'string'
      ? JSON.parse(profile.result)
      : profile.result;

    document.getElementById('kcal-display').textContent    = `${this.result.kcal} ккал`;
    document.getElementById('protein-display').textContent = this.result.protein;
    document.getElementById('fat-display').textContent     = this.result.fat;
    document.getElementById('carbs-display').textContent   = this.result.carbs;
    document.getElementById('summary-member-label').textContent = `Привіт, ${this.data.name}!`;
    this._updateProfileStrip(this.data);
    this._renderResultsFamilyPanel();
    this.showPlan(0, document.querySelector('.plan-tab'));
    this.go('screen-results');
  },

  // ── Auth modal ────────────────────────────────────────────
  showAuthModal(mode = 'login') {
    document.getElementById('auth-overlay').style.display = 'flex';
    this.switchAuthTab(mode);
    document.getElementById('auth-error').style.display = 'none';
  },

  closeAuthModal() {
    document.getElementById('auth-overlay').style.display = 'none';
  },

  switchAuthTab(tab) {
    document.getElementById('form-login').style.display    = tab === 'login'    ? 'block' : 'none';
    document.getElementById('form-register').style.display = tab === 'register' ? 'block' : 'none';
    document.getElementById('tab-login').classList.toggle('active',    tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    document.getElementById('auth-error').style.display = 'none';
  },

  async doLogin() {
    const email    = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    try {
      await Auth.login(email, password);
      this.closeAuthModal();
      Auth.updateUI();
      const profile = await Auth.loadProfile();
      if (profile && profile.result) this._applyProfile(profile);
    } catch (e) {
      this._showAuthError(e.message);
    }
  },

  async doRegister() {
    const name     = document.getElementById('reg-name').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    try {
      await Auth.register(name, email, password);
      this.closeAuthModal();
      Auth.updateUI();
    } catch (e) {
      this._showAuthError(e.message);
    }
  },

  doLogout() {
    Auth.logout();
    Auth.updateUI();
    this.result = null;
    this.data   = { name: '', gender: null, age: null, weight: null, height: null, activity: null, goal: null };
    document.getElementById('results-inline').style.display = 'none';
    this.go('screen-home');
  },

  _showAuthError(msg) {
    const el = document.getElementById('auth-error');
    el.textContent = msg;
    el.style.display = 'block';
  },

  // XSS protection
  _esc(str) {
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  },

  // ── Render right-panel family list (results screen) ───────
  _renderResultsFamilyPanel() {
    const members = Family.getAll();
    const count   = members.length;

    const badge = document.getElementById('rf-count-badge');
    if (badge) badge.textContent = count === 0 ? ''
      : count === 1 ? '1 особа'
      : count < 5  ? `${count} особи`
      : `${count} осіб`;

    const saveBtn = document.getElementById('btn-save-family');
    const goBtn   = document.getElementById('go-to-family-btn');
    if (saveBtn) {
      saveBtn.textContent = this._savedToFamily ? '✓ Збережено' : '+ Зберегти в сім\'ю';
      saveBtn.disabled    = this._savedToFamily;
    }
    if (goBtn) goBtn.style.display = this._savedToFamily ? 'block' : 'none';

    const listEl = document.getElementById('rf-members-list');
    if (!listEl) return;

    if (count === 0) {
      listEl.innerHTML = `
        <div class="rf-empty">
          <div class="rf-empty-icon">👨‍👩‍👧</div>
          <p>Збережи свій раціон і додавай членів сім'ї</p>
        </div>`;
      return;
    }

    const goalLabels = { lose: 'Схуднення', maintain: 'Підтримка', gain: 'Набір маси' };
    const goalClass  = { lose: 'berry',     maintain: 'sage',       gain: 'terra'      };

    listEl.innerHTML = members.map(m => {
      const initials = m.name.substring(0, 2).toUpperCase();
      const active   = this._viewingMemberId === m.id ? 'rf-member-card--active' : '';
      return `
        <div class="rf-member-card ${active}" onclick="App.viewMember(${m.id})">
          <div class="rf-avatar">${this._esc(initials)}</div>
          <div class="rf-info">
            <div class="rf-name">
              ${this._esc(m.name)}
              <span class="member-goal-badge goal-${goalClass[m.goal] || 'sage'}">${goalLabels[m.goal] || ''}</span>
            </div>
            <div class="rf-kcal">${m.result.kcal} ккал/день</div>
            <div class="rf-macros">Б ${m.result.protein}г · Ж ${m.result.fat}г · В ${m.result.carbs}г</div>
          </div>
          <button class="btn-remove-member" onclick="event.stopPropagation();App.removeMember(${m.id})" title="Видалити">✕</button>
        </div>`;
    }).join('');
  },

  // ── Save current calc to family ───────────────────────────
  saveToFamily() {
    if (this._savedToFamily) return;
    Family.add({
      name:       this.data.name,
      gender:     this.data.gender,
      age:        this.data.age,
      weight:     this.data.weight,
      height:     this.data.height,
      activity:   this.data.activity,
      goal:       this.data.goal,
      cycleBonus: this.data.cycleBonus || false,
      result:     this.result,
    });
    this._savedToFamily = true;
    this._renderResultsFamilyPanel();
  },

  // ── Navigate to family screen ─────────────────────────────
  goToFamily() {
    this._renderFamilyScreen();
    this.go('screen-family');
  },

  // ── View a member's meal plan (updates left panel) ────────
  viewMember(id) {
    const m = Family.get(id);
    if (!m) return;

    this._viewingMemberId = id;
    this.result = m.result;

    document.getElementById('kcal-display').textContent    = `${m.result.kcal} ккал`;
    document.getElementById('protein-display').textContent = m.result.protein;
    document.getElementById('fat-display').textContent     = m.result.fat;
    document.getElementById('carbs-display').textContent   = m.result.carbs;
    document.getElementById('summary-member-label').textContent = `Раціон: ${m.name}`;
    this._updateProfileStrip(m);

    this.showPlan(0, document.querySelector('.plan-tab'));
    this._renderResultsFamilyPanel();
    this.go('screen-results');
  },

  // ── Remove a member ───────────────────────────────────────
  removeMember(id) {
    const m = Family.get(id);
    if (!m) return;
    if (!confirm(`Видалити ${m.name} з сім'ї?`)) return;
    if (this._viewingMemberId === id) this._viewingMemberId = null;
    Family.remove(id);
    this._renderResultsFamilyPanel();
    this._renderFamilyScreen();
  },

  // ── Start adding a new member (reset form → home) ─────────
  startAddMember() {
    this.data = { name: '', gender: null, age: null, weight: null, height: null, activity: null, goal: null };
    this._savedToFamily = false;

    // Reset form inputs
    document.getElementById('member-name').value = '';
    ['age', 'weight', 'height'].forEach(id => document.getElementById(id).value = '');
    document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('selected'));
    document.querySelectorAll('input[name="activity"]').forEach(r => r.checked = false);
    document.querySelectorAll('.goal-card').forEach(b => b.classList.remove('selected'));
    document.getElementById('cycle-block').style.display = 'none';
    ['next-1','next-2','next-3','next-4'].forEach(id => document.getElementById(id).disabled = true);

    // Reset step indicators
    document.querySelectorAll('.step').forEach((s, i) => {
      s.classList.remove('active', 'done');
      if (i === 0) s.classList.add('active');
    });
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
    document.getElementById('step-1').classList.add('active');

    document.getElementById('results-inline').style.display = 'none';
    this.go('screen-home');
  },

  // ── Render family screen content ──────────────────────────
  _renderFamilyScreen() {
    const members = Family.getAll();
    const count   = members.length;

    const badge = document.getElementById('family-count-badge');
    badge.textContent = count === 0 ? '0 осіб'
      : count === 1 ? '1 особа'
      : count < 5  ? `${count} особи`
      : `${count} осіб`;

    const summaryEl = document.getElementById('family-summary');
    const listEl    = document.getElementById('family-members-list');

    if (count === 0) {
      summaryEl.style.display = 'none';
      listEl.innerHTML = `
        <div class="family-empty">
          <div class="family-empty-icon">👨‍👩‍👧</div>
          <p>Тут поки нікого немає.</p>
          <p>Додай першого члена сім'ї!</p>
        </div>`;
      return;
    }

    // Family summary totals
    const totalKcal = members.reduce((s, m) => s + m.result.kcal,    0);
    const totalP    = members.reduce((s, m) => s + m.result.protein, 0);
    const totalF    = members.reduce((s, m) => s + m.result.fat,     0);
    const totalC    = members.reduce((s, m) => s + m.result.carbs,   0);

    summaryEl.style.display = 'block';
    document.getElementById('family-total-kcal').textContent = totalKcal;
    document.getElementById('family-total-p').textContent    = totalP;
    document.getElementById('family-total-f').textContent    = totalF;
    document.getElementById('family-total-c').textContent    = totalC;

    const goalLabels = { lose: 'Схуднення', maintain: 'Підтримка', gain: 'Набір маси' };
    const goalClass  = { lose: 'berry',     maintain: 'sage',       gain: 'terra'      };

    listEl.innerHTML = members.map(m => {
      const initials = m.name.substring(0, 2).toUpperCase();
      return `
        <div class="member-card">
          <div class="member-avatar">${this._esc(initials)}</div>
          <div class="member-info">
            <div class="member-name-row">
              <span class="member-name">${this._esc(m.name)}</span>
              <span class="member-goal-badge goal-${goalClass[m.goal] || 'sage'}">${goalLabels[m.goal] || m.goal}</span>
            </div>
            <div class="member-kcal">${m.result.kcal} ккал/день</div>
            <div class="member-macros">
              <span>Б: <strong>${m.result.protein}г</strong></span>
              <span>Ж: <strong>${m.result.fat}г</strong></span>
              <span>В: <strong>${m.result.carbs}г</strong></span>
            </div>
          </div>
          <div class="member-actions">
            <button class="btn-view-member" onclick="App.viewMember(${m.id})">Раціон →</button>
            <button class="btn-remove-member" onclick="App.removeMember(${m.id})" title="Видалити">✕</button>
          </div>
        </div>`;
    }).join('');
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
