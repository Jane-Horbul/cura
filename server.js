const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const path    = require('path');

const app    = express();
const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || 'cura-secret-2024';

app.use(express.json());
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
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(400).json({ error: 'Неправильний email або пароль' });

  const token = jwt.sign({ userId: user.id, name: user.name }, SECRET, { expiresIn: '30d' });
  res.json({ token, name: user.name });
});

// Save profile
app.post('/api/profile', auth, async (req, res) => {
  const { memberName, gender, age, weight, height, activity, goal, result } = req.body;
  await prisma.profile.upsert({
    where:  { userId: req.user.userId },
    update: { memberName, gender, age, weight, height, activity, goal, result },
    create: { userId: req.user.userId, memberName, gender, age, weight, height, activity, goal, result },
  });
  res.json({ ok: true });
});

// Load profile
app.get('/api/profile', auth, async (req, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.user.userId } });
  res.json(profile || {});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Cura listening on port ${PORT}`));
