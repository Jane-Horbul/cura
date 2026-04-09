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
  result:          null,
  _familyMode:     false,   // true when viewing a member from family screen
  _savedToFamily:  false,   // true after saving current calc to family

  // ── Navigation ─────────────────────────────────────────────
  go(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    window.scrollTo(0, 0);
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
    const ok = age >= 14 && age <= 100 && weight >= 30 && weight <= 300 && height >= 100 && height <= 250;
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
      if (!age || age < 14 || age > 100)       { alert('Вкажіть коректний вік (14–100 років).'); return false; }
      if (!weight || weight < 30 || weight > 300) { alert('Вкажіть коректну вагу (30–300 кг).'); return false; }
      if (!height || height < 100 || height > 250) { alert('Вкажіть коректний зріст (100–250 см).'); return false; }
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
  calculate() {
    if (!this.data.goal) { alert('Оберіть мету.'); return; }

    this.data.name = document.getElementById('member-name').value.trim() || 'Я';

    const cycleBonus = this.data.gender === 'female'
      && document.getElementById('cycle-toggle').checked;

    this.result = Calculator.calculate({ ...this.data, cycleBonus });
    this._savedToFamily = false;
    this._familyMode    = false;

    // Update summary card
    document.getElementById('kcal-display').textContent    = `${this.result.kcal} ккал`;
    document.getElementById('protein-display').textContent = this.result.protein;
    document.getElementById('fat-display').textContent     = this.result.fat;
    document.getElementById('carbs-display').textContent   = this.result.carbs;

    // Reset back button and save bar
    document.getElementById('results-back-btn').textContent = '← Змінити дані';
    const saveBar = document.getElementById('family-save-bar');
    saveBar.style.display = 'flex';
    const saveBtn = document.getElementById('btn-save-family');
    saveBtn.textContent = 'Зберегти в сім\'ю';
    saveBtn.disabled = false;
    document.getElementById('go-to-family-btn').style.display = 'none';

    // Show first plan by default
    this.showPlan(0, document.querySelector('.plan-tab'));

    this.go('screen-results');
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

  // XSS protection
  _esc(str) {
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  },

  // ── Results back button (context-aware) ───────────────────
  resultsBack() {
    if (this._familyMode) {
      this._familyMode = false;
      this.goToFamily();
    } else {
      this.go('screen-home');
    }
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

    const btn = document.getElementById('btn-save-family');
    btn.textContent = '✓ Збережено';
    btn.disabled = true;
    document.getElementById('go-to-family-btn').style.display = 'inline';
  },

  // ── Navigate to family screen ─────────────────────────────
  goToFamily() {
    this._renderFamilyScreen();
    this.go('screen-family');
  },

  // ── View a member's meal plan ─────────────────────────────
  viewMember(id) {
    const m = Family.get(id);
    if (!m) return;

    this._familyMode = true;
    this.result = m.result;
    this.data   = { ...m };

    document.getElementById('kcal-display').textContent    = `${m.result.kcal} ккал`;
    document.getElementById('protein-display').textContent = m.result.protein;
    document.getElementById('fat-display').textContent     = m.result.fat;
    document.getElementById('carbs-display').textContent   = m.result.carbs;

    document.getElementById('results-back-btn').textContent = '← До сім\'ї';
    document.getElementById('family-save-bar').style.display = 'none';

    this.showPlan(0, document.querySelector('.plan-tab'));
    this.go('screen-results');
  },

  // ── Remove a member ───────────────────────────────────────
  removeMember(id) {
    const m = Family.get(id);
    if (!m) return;
    if (!confirm(`Видалити ${m.name} з сім'ї?`)) return;
    Family.remove(id);
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
