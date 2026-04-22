const Auth = {
  TOKEN_KEY: 'cura_token',
  NAME_KEY:  'cura_user',

  getToken() { return localStorage.getItem(this.TOKEN_KEY); },
  getName()  { return localStorage.getItem(this.NAME_KEY); },
  isLoggedIn() { return !!this.getToken(); },

  async login(email, password) {
    const r = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'Помилка сервера');
    localStorage.setItem(this.TOKEN_KEY, data.token);
    localStorage.setItem(this.NAME_KEY, data.name);
    return data;
  },

  async register(name, email, password) {
    const r = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'Помилка сервера');
    localStorage.setItem(this.TOKEN_KEY, data.token);
    localStorage.setItem(this.NAME_KEY, data.name);
    return data;
  },

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.NAME_KEY);
  },

  async saveProfile(data) {
    if (!this.isLoggedIn()) return;
    await fetch('/api/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify(data),
    });
  },

  async loadProfile() {
    if (!this.isLoggedIn()) return null;
    const r = await fetch('/api/profile', {
      headers: { 'Authorization': `Bearer ${this.getToken()}` },
    });
    if (!r.ok) return null;
    return r.json().catch(() => null);
  },

  updateUI() {
    const loggedIn = this.isLoggedIn();
    document.getElementById('auth-logged-out').style.display = loggedIn ? 'none'  : 'flex';
    document.getElementById('auth-logged-in').style.display  = loggedIn ? 'flex'  : 'none';
    if (loggedIn) {
      document.getElementById('auth-username').textContent = this.getName();
    }
  },
};
