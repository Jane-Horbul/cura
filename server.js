const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const path    = require('path');

const app    = express();
const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || 'cura-secret-2024';
const SPOON  = process.env.SPOONACULAR_KEY;

app.use(express.json());
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) console.log(req.method, req.path);
  next();
});
app.use(express.static(path.join(__dirname)));

// JWT middleware
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Не авторизовано' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Токен невалідний' });
  }
}

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name)
      return res.status(400).json({ error: 'Заповніть всі поля' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Пароль мінімум 6 символів' });

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(400).json({ error: 'Email вже зареєстровано' });

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hash, name } });
    const token = jwt.sign({ userId: user.id, name: user.name }, SECRET, { expiresIn: '30d' });
    res.json({ token, name: user.name });
  } catch (e) {
    console.error('register error:', e);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ error: 'Неправильний email або пароль' });

    const token = jwt.sign({ userId: user.id, name: user.name }, SECRET, { expiresIn: '30d' });
    res.json({ token, name: user.name });
  } catch (e) {
    console.error('login error:', e);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Save profile
app.post('/api/profile', auth, async (req, res) => {
  try {
    const { memberName, gender, age, weight, height, activity, goal, result } = req.body;
    await prisma.profile.upsert({
      where:  { userId: req.user.userId },
      update: { memberName, gender, age, weight, height, activity, goal, result },
      create: { userId: req.user.userId, memberName, gender, age, weight, height, activity, goal, result },
    });
    res.json({ ok: true });
  } catch (e) {
    console.error('save profile error:', e);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Load profile
app.get('/api/profile', auth, async (req, res) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.user.userId } });
    res.json(profile || {});
  } catch (e) {
    console.error('load profile error:', e);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Meal plan from Spoonacular
app.get('/api/meals', async (req, res) => {
  try {
    const calories = parseInt(req.query.calories) || 2000;

    // Get day meal plan
    const planRes = await fetch(
      `https://api.spoonacular.com/mealplanner/generate?timeFrame=day&targetCalories=${calories}&apiKey=${SPOON}`
    );
    const plan = await planRes.json();

    if (!plan.meals) return res.status(502).json({ error: 'Не вдалось отримати рецепти' });

    // Fetch full info for each meal in parallel
    const details = await Promise.all(
      plan.meals.map(m =>
        fetch(`https://api.spoonacular.com/recipes/${m.id}/information?includeNutrition=true&apiKey=${SPOON}`)
          .then(r => r.json())
      )
    );

    // Convert to our format
    const mealKeys = ['breakfast', 'lunch', 'dinner'];
    const meals = {};

    details.forEach((d, i) => {
      const key = mealKeys[i];
      const nutrients = d.nutrition?.nutrients || [];
      const get = name => Math.round(nutrients.find(n => n.name === name)?.amount || 0);

      meals[key] = {
        name: d.title,
        time: `${d.readyInMinutes} хв`,
        method: d.dishTypes?.[0] || 'приготування',
        ingredients: (d.extendedIngredients || []).map(ing => ({
          name: ing.name,
          amount: Math.round(ing.measures.metric.amount),
          unit: ing.measures.metric.unitShort || 'г',
        })),
        steps: (d.analyzedInstructions?.[0]?.steps || []).map(s => s.step),
        kbju: {
          kcal:    get('Calories'),
          protein: get('Protein'),
          fat:     get('Fat'),
          carbs:   get('Carbohydrates'),
        },
        image:     d.image,
        sourceUrl: d.sourceUrl,
      };
    });

    res.json({ meals, nutrients: plan.nutrients });
  } catch (e) {
    console.error('meals error:', e);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Cura listening on port ${PORT}`));
