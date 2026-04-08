// Mifflin-St Jeor BMR + TDEE + macros calculator

const Calculator = {

  ACTIVITY: {
    sedentary:  1.2,
    light:      1.375,
    moderate:   1.55,
    active:     1.725,
    veryActive: 1.9,
  },

  MACROS: {
    lose:     { protein: 0.30, fat: 0.30, carbs: 0.40 },
    maintain: { protein: 0.25, fat: 0.30, carbs: 0.45 },
    gain:     { protein: 0.25, fat: 0.25, carbs: 0.50 },
  },

  // Meal distribution
  MEAL_SPLIT: {
    breakfast: 0.25,
    lunch:     0.35,
    snack:     0.15,
    dinner:    0.25,
  },

  bmr(gender, weight, height, age) {
    const base = 10 * weight + 6.25 * height - 5 * age;
    return gender === 'male' ? base + 5 : base - 161;
  },

  tdee(bmr, activity) {
    return bmr * (this.ACTIVITY[activity] || 1.2);
  },

  adjustGoal(tdee, goal) {
    if (goal === 'lose') return tdee - 500;
    if (goal === 'gain') return tdee + 300;
    return tdee;
  },

  macros(kcal, goal) {
    const r = this.MACROS[goal] || this.MACROS.maintain;
    return {
      protein: Math.round((kcal * r.protein) / 4),
      fat:     Math.round((kcal * r.fat) / 9),
      carbs:   Math.round((kcal * r.carbs) / 4),
    };
  },

  // Scale a meal's ingredients and kbju to match targetKcal
  scaleMeal(meal, targetKcal) {
    const scale = targetKcal / meal.kbju.kcal;
    return {
      ...meal,
      ingredients: meal.ingredients.map(i => ({
        ...i,
        amount: Math.round(i.amount * scale),
      })),
      kbju: {
        kcal:    Math.round(meal.kbju.kcal    * scale),
        protein: Math.round(meal.kbju.protein * scale),
        fat:     Math.round(meal.kbju.fat     * scale),
        carbs:   Math.round(meal.kbju.carbs   * scale),
      },
    };
  },

  // Full calculation pipeline
  calculate({ gender, age, weight, height, activity, goal, cycleBonus }) {
    const bmr  = this.bmr(gender, weight, height, age);
    const tdee = this.tdee(bmr, activity);
    let kcal   = Math.round(this.adjustGoal(tdee, goal));
    if (cycleBonus) kcal += 200;
    const macros = this.macros(kcal, goal);
    return { kcal, ...macros };
  },
};
