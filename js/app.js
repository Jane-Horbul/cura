// Cura — main application controller

const App = {
  data: {
    gender:   null,
    age:      null,
    weight:   null,
    height:   null,
    activity: null,
    goal:     null,
  },
  result: null,

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

    // Show/hide cycle toggle
    const cycleBlock = document.getElementById('cycle-block');
    cycleBlock.style.display = value === 'female' ? 'block' : 'none';
  },

  // ── Form: goal ─────────────────────────────────────────────
  selectGoal(value, btn) {
    this.data.goal = value;
    document.querySelectorAll('.goal-card').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
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

    const cycleBonus = this.data.gender === 'female'
      && document.getElementById('cycle-toggle').checked;

    this.result = Calculator.calculate({ ...this.data, cycleBonus });

    // Update summary card
    document.getElementById('kcal-display').textContent    = `${this.result.kcal} ккал`;
    document.getElementById('protein-display').textContent = this.result.protein;
    document.getElementById('fat-display').textContent     = this.result.fat;
    document.getElementById('carbs-display').textContent   = this.result.carbs;

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
};
