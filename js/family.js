// Family members storage (localStorage)
const Family = {
  KEY: 'cura_family',

  getAll() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
    catch { return []; }
  },

  save(members) {
    localStorage.setItem(this.KEY, JSON.stringify(members));
  },

  add(member) {
    const list = this.getAll();
    member.id = Date.now();
    list.push(member);
    this.save(list);
    return member.id;
  },

  remove(id) {
    this.save(this.getAll().filter(m => m.id !== id));
  },

  get(id) {
    return this.getAll().find(m => m.id === id);
  },

  count() {
    return this.getAll().length;
  },
};
