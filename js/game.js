/* game.js — game logic: scenes, characters, crowd, input, chat, KTV queue, wardrobe, UI. */
(function () {
'use strict';
const { Renderer, MB, envAt, clamp } = World;
const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a), pick = a => a[(Math.random() * a.length) | 0];
const PI = Math.PI, TAU = PI * 2;
const store = { get(k, d) { try { const v = localStorage.getItem('sc_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('sc_' + k, JSON.stringify(v)); } catch (e) {} } };

/* ---------------- state ---------------- */
const G = {
  R: null, GR: null, model: null, T: null, scenes: {}, scene: null, sceneId: 'plaza',
  me: null, npcs: [], coins: [], hour: 18.4, timeMode: 'auto', t: 0, joy: { x: 0, z: 0 }, keys: {}, target: null,
  coinCount: store.get('coins', 1250), chat: { world: [], team: [], family: [] }, tab: 'world',
  cam: { target: [0, 0, 8], dist: 25, pitch: .7, fov: .62 }, quality: store.get('q', 1.5), crowd: store.get('crowd', 22), outline: store.get('ol', 1),
  transitioning: false, near: null, ktv: { queue: [], cur: null, t: 0, nextAdd: 6 },
};
const SKIN = [[1, 1, 1], [.96, .88, .8], [.88, .74, .62], [.78, .62, .5]];
const HAIRS = ['#2a1a14', '#5b3a29', '#8a5a3a', '#d8b26a', '#c94f6a', '#3b3f7a', '#e8e8f0', '#141414', '#7a4fd0'];
const TOPS = ['#ef6a5b', '#2fb3a3', '#f6b92b', '#6c8cf0', '#c779d9', '#ff9d5c', '#5ac26e', '#f4f4f8', '#2b2b3a', '#ff7ab6'];
const BOTS = ['#f4f4f8', '#2d3a5a', '#3d5a4a', '#e8a0b8', '#2b2b3a', '#c9b48a', '#8b5cf6'];
const SOCKS = ['#6c8cf0', '#f4f4f8', '#2b2b3a', '#ff7ab6', '#5ac26e', '#f6b92b'];
const SHOES = ['#f4f4f8', '#2b2b3a', '#ef6a5b', '#6c8cf0', '#f6b92b'];
const NAMES = ['Siti', 'Wei', 'Priya', '阿明', '小芳', 'Hafiz', 'Jun', 'Jasmine', 'Kenji', 'Mei', 'Raj', 'Sherry', 'Danny', 'Lynn', 'Faizal', 'Ah Boy', '小雨', 'Nana', 'Vincent', 'Aina', 'Kelvin', 'Yuki', '阿杰', 'Dewi', 'Chloe', 'Bobo', '小美', 'Zack', 'Amy', 'Tan'];
const SAY_WORLD = ['有人去 KTV 房间 10 吗？', 'Anyone for KTV Room 10?', '新衣服好好看！', '谁来合唱一首？', "She's good!", 'Hi hi 大家好~', '求组队 ✋', '哈哈哈哈', '今晚有人唱歌吗', 'Mari lepak!', 'Siapa nak join KTV?', '来来来上台！', '刚买的发型怎么样？', '好久没上线了', '有人换装吗～', 'lol', '点歌排队好长啊', '谁在 K 歌厅？', '唱得好听！👏', '一起拍照吗'];
const SAY_TEAM = ['准备好了吗', '等我 1 分钟', '我在喷泉这边', '走，去 KTV', '再等一下队友'];
const SAY_FAMILY = ['家族今晚 9 点开唱！', '欢迎新人～', '谁有空来合唱', '本周家族榜加油💪', '大家晚安'];
const SONGS = [['后来', '刘若英'], ['小幸运', '田馥甄'], ['月亮代表我的心', '邓丽君'], ['江南', '林俊杰'], ['光年之外', 'G.E.M.'], ['告白气球', '周杰伦'], ['夜空中最亮的星', '逃跑计划'], ['爱你', '王心凌'], ['Dancing Queen', 'ABBA'], ['Someone Like You', 'Adele'], ['Shape of You', 'Ed Sheeran'], ['Let It Go', 'Idina Menzel']];

/* ---------------- tiny UI helpers ---------------- */
let toastT = 0;
function toast(msg, ms) { const el = $('toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), ms || 1800); }
function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
function setCoins(n) { G.coinCount = n; $('coinN').textContent = fmt(n); store.set('coins', n); }
function addMsg(ch, name, text, me, sys) {
  const L = G.chat[ch]; L.push({ name, text, me, sys }); if (L.length > 80) L.shift();
  if (ch === G.tab) appendLog({ name, text, me, sys });
}
function appendLog(m) {
  const log = $('log'), d = document.createElement('div'); d.className = 'm' + (m.me ? ' me' : '') + (m.sys ? ' sys' : '');
  if (m.sys) d.textContent = m.text; else { const b = document.createElement('b'); b.textContent = m.name; d.append(b, ': ' + m.text); }
  const stick = log.scrollTop + log.clientHeight >= log.scrollHeight - 12; log.appendChild(d); while (log.children.length > 80) log.removeChild(log.firstChild); if (stick) log.scrollTop = log.scrollHeight;
}
function renderLog() { $('log').innerHTML = ''; G.chat[G.tab].forEach(appendLog); $('log').scrollTop = 1e9; }

/* ---------------- outfits ---------------- */
function rgb(hexc, k) { const c = hexc.replace('#', ''); return [parseInt(c.slice(0, 2), 16) / 255 * (k || 1), parseInt(c.slice(2, 4), 16) / 255 * (k || 1), parseInt(c.slice(4, 6), 16) / 255 * (k || 1)]; }
function applyOutfit(inst, o) {
  inst.recolor = {}; inst.tints = {};
  const rc = (name, hexc, k) => { if (hexc) { const c = rgb(hexc, k || 1).map(v => Math.min(v, 1.3)); inst.recolor[name] = [c[0], c[1], c[2], .92]; } };
  rc('Hair', o.hair, 2.1); rc('Top', o.top, 1); rc('Shorts', o.bottom, 1); rc('Skirt', o.bottom, 1); rc('Socks', o.socks, 1); rc('Shoes', o.shoes, 1);
  const sk = SKIN[o.skin || 0]; inst.tints.Body = sk; inst.tints.Head = sk;
  const skirt = o.bottomType === 'skirt'; inst.hidden.Skirt = !skirt; inst.hidden.Shorts = skirt;
  inst.hidden.Choker = o.choker === false;
  inst.scale = (o.scale || 1) * 1.3;
}
const DEFAULT_OUTFIT = { hair: null, top: null, bottom: null, socks: null, shoes: null, bottomType: 'shorts', choker: true, skin: 0, scale: 1 };
function randomOutfit() {
  return { hair: pick(HAIRS), top: pick(TOPS), bottom: pick(BOTS), socks: pick(SOCKS), shoes: pick(SHOES), bottomType: Math.random() < .45 ? 'skirt' : 'shorts', choker: Math.random() < .6, skin: (Math.random() * 4) | 0, scale: rand(.93, 1.06) };
}

/* ---------------- entities ---------------- */
function makeEntity(x, z, name, outfit, isMe) {
  const inst = GLBChar.makeInstance(G.model, G.GR); inst.play('idle', .01);
  const e = { x, y: 0, z, name, outfit, isMe: !!isMe, inst, yaw: rand(-PI, PI), vx: 0, vz: 0, wait: rand(0, 5), target: null, stuck: 0, moving: false, run: false, bubble: null, bt: 0, pose: 0, mode: 'wander', phase: rand(0, 6), nearT: 0 };
  applyOutfit(inst, outfit); inst.yaw = e.yaw; inst.pos = [x, 0, z]; inst.update(rand(0, 2));
  return e;
}
function blocked(sc, x, z, r) {
  const b = sc.bounds; if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) return true;
  for (const o of sc.obstacles) if (x > o.x0 - r && x < o.x1 + r && z > o.z0 - r && z < o.z1 + r) return true;
  return false;
}
function moveEnt(e, dx, dz, sc) {
  const r = .32; let moved = false;
  if (dx && !blocked(sc, e.x + dx, e.z, r)) { e.x += dx; moved = true; }
  if (dz && !blocked(sc, e.x, e.z + dz, r)) { e.z += dz; moved = true; }
  return moved;
}
function randomSpot(sc) { for (let k = 0; k < 40; k++) { const r = sc.npcRect, x = rand(r.x0, r.x1), z = rand(r.z0, r.z1); if (!blocked(sc, x, z, .6)) return [x, z]; } return [sc.spawn[0], sc.spawn[1]]; }

function populate() {
  const sc = G.scene; G.npcs = [];
  const n = (G.sceneId === 'plaza' || G.sceneId === 'bukit') ? G.crowd : G.sceneId === 'ktv' ? 9 : 4;
  const used = new Set();
  for (let i = 0; i < n; i++) {
    let [x, z] = randomSpot(sc); let nm; do { nm = pick(NAMES); } while (used.has(nm) && used.size < NAMES.length); used.add(nm);
    G.npcs.push(makeEntity(x, z, nm, randomOutfit(), false));
  }
  $('onlineN').textContent = G.npcs.length + 1;
}

/* ---------------- scene switching ---------------- */
function getScene(id) {
  if (!G.scenes[id]) G.scenes[id] = id === 'bukit' ? Scenes.makeBukit(G.R, G.T) : id === 'beach' ? Scenes.makeBeach(G.R, G.T) : id === 'plaza' ? Scenes.makePlaza(G.R, G.T) : id === 'ktv' ? Scenes.makeKTV(G.R, G.T) : Scenes.makeBoutique(G.R, G.T);
  return G.scenes[id];
}
function enterScene(id, spawn) {
  G.scene = getScene(id); G.sceneId = id; G.target = null;
  const s = spawn || G.scene.spawn; G.me.x = s[0]; G.me.z = s[1]; G.me.y = G.scene.heightAt(s[0], s[1]); G.me.vx = G.me.vz = 0;
  G.me.yaw = 0; applyView(); G.cam.target = [s[0], 0, s[1] - (G.scene.camera.lead == null ? 2 : G.scene.camera.lead)];
  G.me.singing = false; G.ktv = { queue: [], cur: null, t: 0, nextAdd: 5 };
  G.near = null; setEnter(null);
  populate(); spawnCoins(); $('banner').hidden = true; $('sceneName').textContent = G.scene.name; closePanels();
  addMsg('world', '', '— 你来到了「' + G.scene.name + '」—', false, true);
  if (id === 'ktv') for (let i = 0; i < 2; i++) ktvEnqueueNpc();
}
/* camera: wide view toggle (scenes may define camera.wide via cameraWide) */
function applyView() { const c = (G.wide && G.scene.cameraWide) || G.scene.camera; G.cam.pitch = c.pitch; G.cam.dist = c.dist; G.cam.fov = c.fov; const b = $('viewBtn'); if (b) b.textContent = '📷 视角：' + (G.wide ? '广角' : '原版'); }

/* interaction button (lives in the action grid): grey + disabled unless a portal / hotspot is in range */
const PORTAL_UI = { boutique: ['👗', '试衣间'], ktv: ['🎤', 'K歌厅'], beach: ['🏖️', '海滩'], bukit: ['🌃', '武吉免登'], pavilion: ['🛍️', '商场'], plaza: ['🚪', '离开'] };
function setEnter(best) {
  const b = $('enterBtn'), tx = $('enterText'), ic = $('enterIcon'); if (!b) return;
  b.disabled = !best;
  if (!best) { tx.textContent = '互动'; ic.textContent = '🚪'; return; }
  const isPortal = G.scene.portals.includes(best);
  if (best.id === 'songs') { tx.textContent = '点歌'; ic.textContent = '🎵'; }
  else if (best.id === 'wardrobe') { tx.textContent = '试衣镜'; ic.textContent = '👗'; }
  else if (isPortal) { const u = PORTAL_UI[best.id] || ['🚪', '进入']; ic.textContent = u[0]; tx.textContent = (best.id === 'plaza' ? '' : '去 ') + u[1]; if (best.id === 'plaza') tx.textContent = '离开'; }
  else { tx.textContent = best.label || '互动'; ic.textContent = typeof best.icon === 'string' ? best.icon : '✨'; }
}

function goTo(id, spawn) {
  if (G.transitioning) return; G.transitioning = true; $('fade').classList.add('on');
  setTimeout(() => { enterScene(id, spawn); setTimeout(() => { $('fade').classList.remove('on'); G.transitioning = false; }, 120); }, 300);
}

/* ---------------- KTV queue ---------------- */
function ktvEnqueueNpc() {
  const q = G.ktv.queue; if (q.length >= 5) return; const e = pick(G.npcs); if (!e || e.mode === 'sing' || q.some(x => x.e === e)) return; const s = pick(SONGS); q.push({ e, name: e.name, song: s[0], artist: s[1], dur: rand(16, 24) });
}
function ktvUpdate(dt) {
  const K = G.ktv, st = G.scene.stage; if (!st) return;
  K.nextAdd -= dt; if (K.nextAdd <= 0) { ktvEnqueueNpc(); K.nextAdd = rand(7, 14); }
  if (!K.cur && K.queue.length) {
    K.cur = K.queue.shift(); K.t = 0; K.arrived = false;
    if (K.cur.you) toast('轮到你了！请走到舞台中央 🎤', 2600); else { K.cur.e.mode = 'sing'; K.cur.e.target = [st.mic[0] + rand(-.6, .6), st.mic[1] + rand(-.3, .3)]; }
  }
  if (K.cur) {
    const c = K.cur, singer = c.you ? G.me : c.e;
    const d = Math.hypot(singer.x - st.mic[0], singer.z - st.mic[1]);
    if (d < 2.4) { K.arrived = true; } if (K.arrived) K.t += dt;
    if (c.you && K.arrived && d > 3.4) { toast('你离开了舞台，演唱结束'); G.me.singing = false; K.cur = null; return; }
    G.me.singing = !!(c.you && K.arrived);
    if (K.arrived && !c.e) {} // you
    if (K.arrived) { singer.yaw = 0; singer.singPulse = (singer.singPulse || 0) + dt; if (Math.random() < dt * .8) setBubble(singer, pick(['♪', '♫', '♪♪', '🎵'])); }
    const left = Math.max(0, c.dur - K.t);
    $('banner').hidden = false; $('banner').textContent = (K.arrived ? '🎤 正在演唱：' : '🎤 请上台：') + c.name + ' — ' + c.song + (K.arrived ? '  ' + Math.ceil(left) + 's' : '') + (K.queue.length ? '　下一位：' + K.queue[0].name : '');
    if (K.arrived && K.t >= c.dur) { if (c.you) { setCoins(G.coinCount + 200); toast('演唱完成！+200 金币 🎉', 2400); addMsg('world', '', '你演唱了《' + c.song + '》，获得 200 金币', false, true); G.me.singing = false; } else { c.e.mode = 'wander'; c.e.wait = rand(1, 4); } K.cur = null; }
  } else { $('banner').hidden = true; }
  renderQueue();
}
function renderQueue() {
  const K = G.ktv, el = $('queueList'); if ($('songPanel').hidden) return;
  const rows = []; if (K.cur) rows.push({ ...K.cur, now: true }); K.queue.forEach(x => rows.push(x));
  el.innerHTML = rows.length ? rows.map((x, i) => `<div class="q${x.now ? ' now' : ''}${x.you ? ' you' : ''}"><span>${x.now ? '🎤' : i}</span><span><b>${x.name}</b> — ${x.song}</span></div>`).join('') : '<p class="hint">还没有人点歌，来当第一个吧！</p>';
}
function openSongs() {
  const l = $('songList'); if (!l.children.length) SONGS.forEach(([s, a]) => { const b = document.createElement('button'); b.className = 'song'; b.innerHTML = `${s}<small>${a}</small>`; b.onclick = () => {
    const K = G.ktv; if (K.queue.some(x => x.you) || (K.cur && K.cur.you)) return toast('你已经点过歌啦，先排队吧');
    K.queue.push({ name: '我', you: true, song: s, artist: a, dur: 22 }); toast('已点歌：' + s + '（前面还有 ' + (K.queue.length - 1 + (K.cur ? 1 : 0)) + ' 位）'); renderQueue(); }; l.appendChild(b); });
  $('songPanel').hidden = false; renderQueue();
}

/* ---------------- wardrobe ---------------- */
function openWardrobe() {
  const o = G.me.outfit, root = $('wardOpts'); root.innerHTML = '';
  const row = (label, key, list, def) => {
    const r = document.createElement('div'); r.className = 'row'; r.innerHTML = `<label>${label}</label>`;
    if (def) { const b = document.createElement('button'); b.className = 'sw def' + (!o[key] ? ' on' : ''); b.title = '默认'; b.onclick = () => { o[key] = null; commit(); }; r.appendChild(b); }
    list.forEach(c => { const b = document.createElement('button'); b.className = 'sw' + (o[key] === c ? ' on' : ''); b.style.background = c; b.onclick = () => { o[key] = c; commit(); }; r.appendChild(b); });
    root.appendChild(r);
  };
  const chips = (label, key, opts) => { const r = document.createElement('div'); r.className = 'row'; r.innerHTML = `<label>${label}</label>`; opts.forEach(([v, t]) => { const b = document.createElement('button'); b.className = 'chip' + (o[key] === v ? ' on' : ''); b.textContent = t; b.onclick = () => { o[key] = v; commit(); }; r.appendChild(b); }); root.appendChild(r); };
  const commit = () => { applyOutfit(G.me.inst, o); store.set('outfit', o); openWardrobe(); };
  row('发色', 'hair', HAIRS, true); row('上衣', 'top', TOPS, true); chips('下装', 'bottomType', [['shorts', '短裤'], ['skirt', '短裙']]); row('下装色', 'bottom', BOTS, true);
  row('袜子', 'socks', SOCKS, true); row('鞋子', 'shoes', SHOES, true); chips('项圈', 'choker', [[true, '戴'], [false, '不戴']]);
  const sr = document.createElement('div'); sr.className = 'row'; sr.innerHTML = '<label>肤色</label>'; SKIN.forEach((s, i) => { const b = document.createElement('button'); b.className = 'sw' + ((o.skin || 0) === i ? ' on' : ''); b.style.background = `rgb(${255 * s[0] | 0},${(214 * s[1]) | 0},${(190 * s[2]) | 0})`; b.onclick = () => { o.skin = i; commit(); }; sr.appendChild(b); }); root.appendChild(sr);
  const hint = document.createElement('p'); hint.className = 'hint'; hint.textContent = '之后的衣服 / 发型会做成商店里卖的 GLB 部件，用金币购买后放进背包更换。'; root.appendChild(hint);
  $('wardPanel').hidden = false;
}
function closePanels() { document.querySelectorAll('.sheet').forEach(p => p.hidden = true); }

/* ---------------- chat ---------------- */
function setBubble(e, text) { e.bubble = text.length > 26 ? text.slice(0, 25) + '…' : text; e.bt = 4.5; }
function sendChat(text) {
  text = text.trim(); if (!text) return; addMsg(G.tab, '我', text, true); setBubble(G.me, text);
}
function npcChat(dt) {
  G.chatT = (G.chatT || 0) - dt; if (G.chatT > 0 || !G.npcs.length) return; G.chatT = rand(2.5, 6);
  const e = pick(G.npcs), r = Math.random(), ch = r < .72 ? 'world' : r < .86 ? 'team' : 'family', text = pick(ch === 'world' ? SAY_WORLD : ch === 'team' ? SAY_TEAM : SAY_FAMILY);
  addMsg(ch, e.name, text); if (ch === 'world' || Math.random() < .3) setBubble(e, text);
}

/* ---------------- coins (plaza) ---------------- */
function spawnCoins() {
  G.coins = []; /* ground coins removed: coins now come from KTV, beach activities, wishes, etc. */
}

/* ---------------- update ---------------- */
function update(dt) {
  G.t += dt; const sc = G.scene, me = G.me;
  // time of day
  if (G.timeMode === 'auto') G.hour = (G.hour + dt / 15) % 24;
  // player input
  let ix = G.joy.x, iz = G.joy.z; const k = G.keys;
  if (k.ArrowLeft || k.a) ix -= 1; if (k.ArrowRight || k.d) ix += 1; if (k.ArrowUp || k.w) iz -= 1; if (k.ArrowDown || k.s) iz += 1;
  let mag = Math.hypot(ix, iz);
  if (mag > .12) { G.target = null; if (mag > 1) { ix /= mag; iz /= mag; mag = 1; } }
  else if (G.target) { const dx = G.target[0] - me.x, dz = G.target[1] - me.z, d = Math.hypot(dx, dz); if (d < .25) G.target = null; else { ix = dx / d; iz = dz / d; mag = 1; me.stuck += dt; } } else { ix = iz = mag = 0; }
  if (mag > .12) {
    const run = mag > .85 && (G.joy.x || G.joy.z || k.Shift) ? 1 : 0, sp = (run ? 6.2 : 3.8) * (mag > .85 ? 1 : mag / .85);
    const px = me.x, pz = me.z; moveEnt(me, ix / (mag || 1) * sp * dt, iz / (mag || 1) * sp * dt, sc);
    if (Math.hypot(me.x - px, me.z - pz) < sp * dt * .2) { if (G.target) { me.stuck += dt; if (me.stuck > .5) G.target = null; } } else me.stuck = 0;
    me.moving = true; me.run = !!run; me.pose = 0; const want = Math.atan2(ix, iz); let d = want - me.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); me.yaw += d * Math.min(1, dt * 12);
  } else me.moving = false;
  me.y = sc.heightAt(me.x, me.z);
  // npcs
  for (const e of G.npcs) npcStep(e, dt, sc);
  // soft separation
  const all = [me, ...G.npcs];
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) { const a = all[i], b = all[j], dx = b.x - a.x, dz = b.z - a.z, d2 = dx * dx + dz * dz; if (d2 < .36 && d2 > 1e-5) { const d = Math.sqrt(d2), p = (.6 - d) * .5; const ux = dx / d * p, uz = dz / d * p; if (a !== me) moveEnt(a, -ux, -uz, sc); else moveEnt(a, -ux * .3, -uz * .3, sc); if (b !== me) moveEnt(b, ux, uz, sc); } }
  // animation + bubbles
  for (const e of all) {
    const inst = e.inst; let clip = 'idle';
    if (e.pose > 0) { e.pose -= dt; clip = 'wave'; } else if (e.moving) clip = e.run ? 'run' : 'walk'; else if (e.mode === 'sing' && e.arrivedStage || (e.isMe && e.singing)) clip = (Math.sin(G.t * 1.7 + e.phase) > .3) ? 'wave' : 'idle';
    inst.play(clip, .2); inst.speed = e.moving ? (e.run ? 1 : (e.isMe ? 1.1 : 1.0)) : 1;
    if (e.vis !== false || e.isMe) inst.update(dt);
    inst.pos[0] = e.x; inst.pos[1] = e.y; inst.pos[2] = e.z; let d = e.yaw - inst.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); inst.yaw += d * Math.min(1, dt * 14);
    if (e.bt > 0) { e.bt -= dt; if (e.bt <= 0) e.bubble = null; }
  }
  // coins
  for (let i = G.coins.length - 1; i >= 0; i--) { const c = G.coins[i]; if (Math.hypot(c.x - me.x, c.z - me.z) < .9) { G.coins.splice(i, 1); setCoins(G.coinCount + 10); const [x, z] = randomSpot(sc); setTimeout(() => G.coins.push({ x, z, ph: rand(0, 6) }), 4000); } }
  if (G.sceneId === 'ktv') ktvUpdate(dt);
  npcChat(dt);
  // interactions (portals / hotspots)
  let best = null, bd = 1e9; for (const p of [...sc.portals, ...sc.hotspots]) { const d = Math.hypot(me.x - p.x, me.z - p.z); if (d < p.r && d < bd) { bd = d; best = p; } }
  if (best !== G.near) { G.near = best; setEnter(best); }
  // camera follow
  const cc = sc.camera, tx = clamp(me.x, cc.clampX[0], cc.clampX[1]), tz = clamp(me.z - (cc.lead == null ? 2 : cc.lead), cc.clampZ[0], cc.clampZ[1]), a = 1 - Math.exp(-dt * 5);
  G.cam.target[0] += (tx - G.cam.target[0]) * a; G.cam.target[2] += (tz - G.cam.target[2]) * a;
}
function npcStep(e, dt, sc) {
  const cs = 1.35;
  if (e.mode === 'sing') {
    if (e.target) { const dx = e.target[0] - e.x, dz = e.target[1] - e.z, d = Math.hypot(dx, dz); if (d > .3) { moveEnt(e, dx / d * 2.4 * dt, dz / d * 2.4 * dt, sc); e.yaw = Math.atan2(dx, dz); e.moving = true; e.run = false; } else { e.moving = false; e.arrivedStage = true; e.yaw = 0; } }
    e.y = sc.heightAt(e.x, e.z); return;
  }
  e.arrivedStage = false;
  if (e.wait > 0) { e.wait -= dt; e.moving = false; if (e.wait <= 0) { const near = Math.random() < .4 ? pick(G.npcs) : null; e.target = near && near !== e ? [near.x + rand(-1.4, 1.4), near.z + rand(-1.4, 1.4)] : randomSpot(sc); if (blocked(sc, e.target[0], e.target[1], .4)) e.target = randomSpot(sc); e.stuck = 0; } e.y = sc.heightAt(e.x, e.z); return; }
  if (!e.target) { e.wait = rand(2, 7); return; }
  const dx = e.target[0] - e.x, dz = e.target[1] - e.z, d = Math.hypot(dx, dz);
  if (d < .35 || e.stuck > 1.2) { e.target = null; e.wait = rand(2, 9); e.moving = false; if (Math.random() < .5) e.yaw += rand(-1.5, 1.5); return; }
  const px = e.x, pz = e.z; moveEnt(e, dx / d * cs * dt, dz / d * cs * dt, sc);
  if (Math.hypot(e.x - px, e.z - pz) < cs * dt * .3) e.stuck += dt; else e.stuck = 0;
  e.moving = true; e.run = false; let a = Math.atan2(dx, dz) - e.yaw; a = Math.atan2(Math.sin(a), Math.cos(a)); e.yaw += a * Math.min(1, dt * 8); e.y = sc.heightAt(e.x, e.z);
}

/* ---------------- render ---------------- */
const dynShadow = new MB(), dynGlow = new MB(), dynCoin = new MB();
const ovc = $('ov'), ov = ovc.getContext('2d');
function render() {
  const R = G.R, GR = G.GR, sc = G.scene, [w, h, dpr] = R.resize();
  const env = sc.env(G.hour), cam = G.cam;
  const view = R.setCamera({ target: [cam.target[0], 0.8, cam.target[2]], dist: cam.dist, pitch: cam.pitch, fov: cam.fov }, w, h);
  R.begin(env, w, h, G.t);
  // static opaque
  for (const b of sc.batches) if (b.mat.mode === 0) R.draw(b);
  // coins (opaque, billboard)
  dynCoin.v.length = 0; dynCoin.i.length = 0; dynCoin.n = 0;
  if (G.coins.length) {
    const c = Math.cos(cam.pitch), s = Math.sin(cam.pitch);
    for (const k of G.coins) { const sp = Math.abs(Math.cos(G.t * 2.6 + k.ph)) * .28 + .06, y = .9 + Math.sin(G.t * 3 + k.ph) * .08, r = .24;
      dynCoin.quad([k.x - sp, y - r * c, k.z + r * s], [k.x + sp, y - r * c, k.z + r * s], [k.x + sp, y + r * c, k.z - r * s], [k.x - sp, y + r * c, k.z - r * s], [0, 0, 1], [0, 0, 1, 1], [1, 1, 1]); }
    R.drawDynamic(dynCoin, { tex: G.T.coin, em: G.T.coinEm, emDay: .55, emNight: 1.4 });
  }
  // shadows
  dynShadow.v.length = 0; dynShadow.i.length = 0; dynShadow.n = 0;
  const all = [G.me, ...G.npcs];
  for (const e of all) { const r = .5 * e.inst.scale; dynShadow.floor(e.x - r, e.z - r, e.x + r, e.z + r, e.y + .03, [0, 0, 0]); }
  R.drawDynamic(dynShadow, { tex: G.T.blob, mode: 3, glow: env.indoor ? .5 : .42 - .14 * env.night });
  // characters
  const px = (2 * cam.dist * Math.tan(cam.fov / 2)) / h, olw = G.outline ? Math.max(.007, px * 1.7) : 0;
  const lightDir = env.dir, rim = env.night > .5 ? [.7, .45, 1] : [.45, .55, 1];
  const vis = [];
  for (const e of all) {
    const p = R.project([e.x, e.y + .9, e.z]); if (!p || p[0] < -80 || p[0] > w + 80 || p[1] < -140 || p[1] > h + 140) { e.vis = false; continue; }
    e.vis = true; e.sx = p[0]; e.sy = p[1]; vis.push(e);
  }
  const ordered = vis.slice().sort((a, b) => Math.hypot(a.x - G.me.x, a.z - G.me.z) - Math.hypot(b.x - G.me.x, b.z - G.me.z));
  ordered.forEach((e, i) => {
    GR.draw(e.inst, view.VP, { light: lightDir, amb: env.charAmb, sun: env.charSun, view: [0, Math.sin(cam.pitch), Math.cos(cam.pitch)], outline: i < 26 ? olw : 0, line: env.line, rim });
  });
  // glows & additive layers
  for (const b of sc.batches) if (b.mat.mode >= 2) R.draw(b);
  dynGlow.v.length = 0; dynGlow.i.length = 0; dynGlow.n = 0;
  const pulse = .55 + .3 * Math.sin(G.t * 3.2);
  for (const p of [...sc.portals, ...sc.hotspots]) { const r = (p.r + .15 + .12 * Math.sin(G.t * 3.2)); dynGlow.floor(p.x - r, p.z - r, p.x + r, p.z + r, .05, p.color || [1, 1, 1]); }
  R.gl.useProgram(R.prog.p); R.drawDynamic(dynGlow, { tex: G.T.ring, mode: 2, glow: pulse });
  // ---- overlay: names, bubbles
  ovc.width = w; ovc.height = h; ov.clearRect(0, 0, w, h); ov.textAlign = 'center'; ov.textBaseline = 'middle';
  const sc2 = dpr, fs = 12 * sc2;
  for (const e of vis) {
    const near = Math.hypot(e.x - G.me.x, e.z - G.me.z) < 6.5 || e.isMe;
    const top = R.project([e.x, e.y + 1.78 * e.inst.scale, e.z]); if (!top) continue;
    let y = top[1] - 6 * sc2;
    if (e.bubble) { ov.font = `600 ${fs}px system-ui,"PingFang SC","Noto Sans SC",sans-serif`; const tw = ov.measureText(e.bubble).width + 16 * sc2, bh = 22 * sc2; y -= bh + 20 * sc2 * (near ? 1 : 0); bubble(ov, top[0], y, tw, bh, e.bubble, sc2); y += bh + 4 * sc2; }
    if (near || e.bubble) { ov.font = `700 ${fs}px system-ui,"PingFang SC","Noto Sans SC",sans-serif`; const tw = ov.measureText(e.name).width + 14 * sc2, bh = 18 * sc2, ty = top[1] - 6 * sc2 - bh / 2; pill(ov, top[0] - tw / 2, ty - bh / 2, tw, bh, e.isMe ? '#ffcf4a' : 'rgba(20,16,44,.78)'); ov.fillStyle = e.isMe ? '#2a1c00' : '#f4efff'; ov.fillText(e.name, top[0], ty + 1); }
  }
}
function pill(g, x, y, w, h, fill) { g.fillStyle = fill; g.beginPath(); const r = h / 2; g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.fill(); }
function bubble(g, cx, y, w, h, text, s) {
  g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); const x = cx - w / 2, r = 9 * s; g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.lineTo(cx + 5 * s, y + h); g.lineTo(cx, y + h + 6 * s); g.lineTo(cx - 5 * s, y + h); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.fill();
  g.fillStyle = '#251d3f'; g.fillText(text, cx, y + h / 2 + s);
}

/* ---------------- HUD clock ---------------- */
function updateClock() {
  const h = G.hour, hh = Math.floor(h), mm = Math.floor((h - hh) * 60), env = envAt(h);
  $('timeText').textContent = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  $('timeIcon').textContent = env.night > .6 ? '🌙' : env.gold > .35 ? '🌇' : '☀️';
  $('timeMode').textContent = { auto: '自动', day: '白天', dusk: '黄昏', night: '夜晚' }[G.timeMode];
}

/* ---------------- input ---------------- */
function bindInput() {
  // joystick
  const joy = $('joy'), knob = $('knob'); let jid = null, jc = null;
  const jm = e => { const R = joy.getBoundingClientRect(), r = R.width / 2, cx = R.left + r, cy = R.top + r; let dx = e.clientX - cx, dz = e.clientY - cy; const d = Math.hypot(dx, dz), m = Math.min(1, d / r); if (d > 0) { dx /= d; dz /= d; } G.joy.x = dx * m; G.joy.z = dz * m; knob.style.transform = `translate(${dx * m * r * .6}px,${dz * m * r * .6}px)`; };
  joy.addEventListener('pointerdown', e => { jid = e.pointerId; joy.setPointerCapture(jid); jm(e); e.preventDefault(); });
  joy.addEventListener('pointermove', e => { if (e.pointerId === jid) jm(e); });
  const jend = e => { if (e.pointerId === jid) { jid = null; G.joy.x = G.joy.z = 0; knob.style.transform = ''; } };
  joy.addEventListener('pointerup', jend); joy.addEventListener('pointercancel', jend);
  // keyboard
  addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; G.keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = true; if (e.key === 'e' || e.key === 'Enter') { if (G.near) interact(); } });
  addEventListener('keyup', e => { G.keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; });
  // tap to move
  const gl = $('gl'); let down = null;
  gl.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY, performance.now()]; });
  gl.addEventListener('pointerup', e => {
    if (!down || G.transitioning) return; const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]); down = null; if (moved > 10) return;
    const dpr = G.R.canvas.width / G.R.canvas.clientWidth, g = G.R.pickGround(e.clientX * dpr, e.clientY * dpr, 0), b = G.scene.bounds;
    G.target = [clamp(g[0], b.x0, b.x1), clamp(g[2], b.z0, b.z1)]; G.me.stuck = 0; G.markT = 0.9;
  });
  // buttons
  $('enterBtn').onclick = interact;
  $('actions').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; const a = b.dataset.act;
    if (a === 'pose') { G.me.pose = 3; setBubble(G.me, pick(['嗨～', '大家好！', '✌', 'Hello~'])); }
    else if (a === 'wardrobe') openWardrobe();
    else if (a === 'chat') { $('chatIn').focus(); }
    else if (a === 'chorus') toast(G.sceneId === 'ktv' ? '合唱：先在点歌机点歌，邀请好友后可一起上台（开发中）' : '合唱要在 KTV 大堂里使用，进去试试吧 🎤');
    else if (a === 'friends') toast('好友系统：联网版开发中');
    else if (a === 'gift') toast('礼物商店：之后接入金币和道具 🎁');
  });
  $('tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; G.tab = b.dataset.ch; [...$('tabs').children].forEach(x => x.classList.toggle('on', x === b)); renderLog(); });
  $('chatForm').addEventListener('submit', e => { e.preventDefault(); sendChat($('chatIn').value); $('chatIn').value = ''; });
  $('chatIn').addEventListener('keydown', e => e.stopPropagation());
  $('viewBtn').onclick = () => { G.wide = !G.wide; applyView(); };
  document.querySelectorAll('[data-close]').forEach(b => b.onclick = closePanels);
  $('timeChip').onclick = () => { const order = ['auto', 'day', 'dusk', 'night'], i = (order.indexOf(G.timeMode) + 1) % 4; G.timeMode = order[i]; if (G.timeMode === 'day') G.hour = 12.5; if (G.timeMode === 'dusk') G.hour = 18.4; if (G.timeMode === 'night') G.hour = 22; updateClock(); };
  $('serverBtn').onclick = () => toast('服务器：目前是本地演示，联网版之后再做');
  $('gear').onclick = () => { $('setPanel').hidden = false; syncSeg(); };
  const seg = (id, key, fn) => $(id).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; fn(parseFloat(b.dataset.v)); syncSeg(); });
  seg('segCrowd', 'crowd', v => { G.crowd = v; store.set('crowd', v); if (G.sceneId === 'plaza' || G.sceneId === 'bukit') populate(); });
  seg('segQ', 'q', v => { G.quality = v; store.set('q', v); });
  seg('segOl', 'ol', v => { G.outline = v; store.set('ol', v); });
  addEventListener('contextmenu', e => e.preventDefault());
}
function syncSeg() { [['segCrowd', G.crowd], ['segQ', G.quality], ['segOl', G.outline]].forEach(([id, v]) => [...$(id).children].forEach(b => b.classList.toggle('on', parseFloat(b.dataset.v) === v))); }
function pay(c, ok, msg) { if (G.coinCount < c) { toast('金币不够啦（需要 ' + c + '）'); return false; } setCoins(G.coinCount - c); toast(ok, 2400); if (msg) setBubble(G.me, msg); return true; }
/* Bukit Bintang hotspots (the beach scene handles its own hotspots in scene_beach.js) */
function hotAct(n) {
  switch (n.id) {
    case 'teh': pay(15, '🥤 拉茶一杯！-15 金币，拉得真高～', '好喝！'); break;
    case 'satay': pay(20, '🍢 沙爹 10 串，花生酱超香！-20 金币', '沙爹赞！'); break;
    case 'durian': pay(30, '🍈 猫山王榴莲！好臭但好吃 -30 金币', '榴莲万岁'); break;
    case 'roti': pay(12, '🥞 印度煎饼配咖喱 -12 金币', '好烫！'); break;
    case 'fountain': if (pay(10, '⛲ 你投了一枚硬币，默默许了愿…', '许愿～')) { if (Math.random() < .3) setTimeout(() => { setCoins(G.coinCount + 50); toast('✨ 愿望成真！+50 金币', 2400); }, 1200); } break;
    case 'photo': G.me.pose = 3; G.me.yaw = 0; setBubble(G.me, '✌ KL！'); $('fade').classList.add('on'); setTimeout(() => $('fade').classList.remove('on'), 140); toast('📸 咔嚓！已保存到相册（演示）', 2400); break;
    case 'busker': if (pay(5, '🎸 你给艺人打赏了 5 金币，他为你弹了一曲', '♪')) { G.me.pose = 3; } break;
    case 'pavilion': toast('🛍 Pavilion 商场室内：下一个场景，开发中', 2600); break;
    default: return false;
  }
  return true;
}
function interact() {
  const n = G.near; if (!n || G.transitioning) return;
  if (G.sceneId === 'bukit' && hotAct(n)) return;
  if (n.id === 'songs') openSongs(); else if (n.id === 'wardrobe') openWardrobe();
  else if (G.scene.portals.includes(n)) goTo(n.id, n.spawn || null);
}

/* ---------------- avatar portrait ---------------- */
function drawPortrait() {
  const gl = G.R.gl, GR = G.GR, me = G.me, S = 256, ctx = $('avatar').getContext('2d');
  const old = me.inst.pos.slice(), oy = me.inst.yaw; me.inst.pos = [0, 0, 0]; me.inst.yaw = 0.25; me.inst.update(0);
  gl.viewport(0, 0, S, S); gl.enable(gl.SCISSOR_TEST); gl.scissor(0, 0, S, S); gl.clearColor(.72, .66, .95, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.disable(gl.BLEND); gl.depthMask(true); gl.enable(gl.DEPTH_TEST);
  const vp = GR.viewProj({ yaw: 0, pitch: 0, halfH: .2, target: [0, 1.5, 0] }, S, S);
  GR.draw(me.inst, vp, { outline: .006, amb: [.62, .6, .78], sun: [.45, .42, .26], line: [.23, .14, .17], light: [-.3, .5, 1], view: [0, 0, 1] });
  ctx.clearRect(0, 0, 128, 128); ctx.drawImage(G.R.canvas, 0, G.R.canvas.height - S, S, S, 0, 0, 128, 128);
  gl.disable(gl.SCISSOR_TEST); me.inst.pos = old; me.inst.yaw = oy;
}

/* ---------------- boot ---------------- */
async function boot() {
  const text = $('loadText');
  try {
    G.R = new Renderer($('gl'));
    G.GR = GLBChar.createRenderer($('gl'), {});
    text.textContent = '生成场景…';
    G.T = Scenes.makeTextures(G.R);
    G.T.coin = G.R.paint(64, 64, g => { const gr = g.createRadialGradient(24, 22, 4, 32, 32, 30); gr.addColorStop(0, '#fff3b0'); gr.addColorStop(.6, '#f4b415'); gr.addColorStop(1, '#a86a00'); g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 28, 0, 7); g.fill(); g.strokeStyle = '#7a4f00'; g.lineWidth = 3; g.stroke(); g.fillStyle = '#b57800'; g.font = '800 30px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('★', 32, 34); }, { clamp: true });
    G.T.coinEm = G.R.paint(64, 64, g => { g.fillStyle = '#4a3000'; g.fillRect(0, 0, 64, 64); }, { clamp: true });
    text.textContent = '加载角色模型…';
    let buf; if (window.GLB64) { const s = atob(window.GLB64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); buf = u.buffer; } else buf = await (await fetch('assets/girl.glb')).arrayBuffer();
    G.model = await GLBChar.loadModel(buf, G.GR);
    const saved = store.get('outfit', null); G.me = makeEntity(0, 8, '我', Object.assign({}, DEFAULT_OUTFIT, saved || {}), true);
    G.scene = getScene('plaza'); enterScene('plaza'); spawnCoins();
    for (let i = 0; i < 6; i++) { const t = pick(SAY_WORLD); addMsg('world', pick(NAMES), t); }
    bindInput(); setCoins(G.coinCount); updateClock(); syncSeg(); renderLog();
    let last = performance.now(), clk = 0, firstPortrait = true;
    const frame = now => {
      const dt = Math.min(.05, (now - last) / 1000); last = now; clk += dt;
      if (!G.transitioning || true) update(dt);
      const dpr = Math.min(window.devicePixelRatio || 1, G.quality); G.R.resize = G.R.resize; // quality handled below
      render(); if (firstPortrait) { drawPortrait(); firstPortrait = false; $('loading').classList.add('done'); }
      if (clk > .4) { clk = 0; updateClock(); }
      requestAnimationFrame(frame);
    };
    // quality => canvas resolution scale
    const origResize = G.R.resize.bind(G.R);
    G.R.resize = function () {
      const q = Math.min(window.devicePixelRatio || 1, G.quality), cv = this.canvas, w = Math.max(2, Math.round(cv.clientWidth * q)), h = Math.max(2, Math.round(cv.clientHeight * q));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } return [w, h, q];
    };
    requestAnimationFrame(frame);
    G.api = { goTo, openSongs, openWardrobe, enterScene }; window.__game = G;
  } catch (err) { console.error(err); text.textContent = '加载失败：' + err.message + '（需要支持 WebGL2 的浏览器）'; }
}
boot();
})();
