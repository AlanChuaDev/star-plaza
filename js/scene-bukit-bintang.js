/* scene-bukit-bintang.js — Bukit Bintang / Pavilion KL 广场 (独立场景文件, 注册为 Scenes.makeBukit)
   弧形商场 + 放射状排屋/小贩街 + 远处双子塔/KL塔天际线, 无方盒围墙. */
(function (G) {
'use strict';
const { MB, hex, clamp } = G.World;
const TAU = Math.PI * 2, PITCH = 0.5;
const rnd = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const CX = 0, CZ = 4;                                   // 广场圆心
const polar = (r, th) => [CX + r * Math.sin(th), CZ - r * Math.cos(th)];   // th=0 朝后(商场), +th 朝右

/* ---------- 几何小工具 ---------- */
function halo(mb, x, y, z, s, col) { const c = Math.cos(PITCH), sn = Math.sin(PITCH); const P = (a, b) => [x + a * s, y + c * b * s, z - sn * b * s]; mb.quad(P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), [0, 1, 0], [0, 0, 1, 1], col); }
function pool(mb, x, z, r, col, y) { mb.floor(x - r, z - r, x + r, z + r, y == null ? .04 : y, col); }
function rbox(mb, cx, cz, w, d, y0, y1, yaw, col, tile, o) {          // 可旋转的盒子 (正面朝 local +z)
  o = o || {}; col = col || [1, 1, 1]; const c = Math.cos(yaw), s = Math.sin(yaw), hw = w / 2, hd = d / 2, tw = tile ? tile[0] : 1e9, th = tile ? tile[1] : 1e9, H = y1 - y0;
  const P = (lx, lz, y) => [cx + lx * c + lz * s, y, cz - lx * s + lz * c];
  const F = (a, b, n, len) => mb.quad(P(a[0], a[1], y0), P(b[0], b[1], y0), P(b[0], b[1], y1), P(a[0], a[1], y1), n, [0, 0, len / tw, H / th], col);
  if (!o.noFront) F([-hw, hd], [hw, hd], [s, 0, c], w);
  if (!o.noBack) F([hw, -hd], [-hw, -hd], [-s, 0, -c], w);
  if (!o.noSides) { F([hw, hd], [hw, -hd], [c, 0, -s], d); F([-hw, -hd], [-hw, hd], [-c, 0, s], d); }
  if (!o.noTop) mb.quad(P(-hw, hd, y1), P(hw, hd, y1), P(hw, -hd, y1), P(-hw, -hd, y1), [0, 1, 0], [0, 0, w / tw, d / th], col);
}
function arcWall(mb, cx, cz, R, a0, a1, y0, y1, seg, tile, col) {      // 朝圆心的弧形墙
  let u = 0; const L = R * (a1 - a0) / seg; col = col || [1, 1, 1];
  for (let k = 0; k < seg; k++) { const A = a0 + (a1 - a0) * k / seg, B = a0 + (a1 - a0) * (k + 1) / seg, m = (A + B) / 2;
    mb.quad([cx + R * Math.sin(A), y0, cz - R * Math.cos(A)], [cx + R * Math.sin(B), y0, cz - R * Math.cos(B)], [cx + R * Math.sin(B), y1, cz - R * Math.cos(B)], [cx + R * Math.sin(A), y1, cz - R * Math.cos(A)], [-Math.sin(m), 0, Math.cos(m)], [u / tile[0], 0, (u + L) / tile[0], (y1 - y0) / tile[1]], col); u += L; }
}
function arcFloor(mb, cx, cz, R0, R1, a0, a1, y, seg, col) {
  for (let k = 0; k < seg; k++) { const A = a0 + (a1 - a0) * k / seg, B = a0 + (a1 - a0) * (k + 1) / seg;
    mb.quad([cx + R1 * Math.sin(A), y, cz - R1 * Math.cos(A)], [cx + R1 * Math.sin(B), y, cz - R1 * Math.cos(B)], [cx + R0 * Math.sin(B), y, cz - R0 * Math.cos(B)], [cx + R0 * Math.sin(A), y, cz - R0 * Math.cos(A)], [0, 1, 0], [0, 0, 1, 1], col); }
}
function star(mb, cx, cz, y0, y1, Ro, Ri, col, tile, cap) {            // 8角星截面柱 (双子塔)
  const n = 16, p = []; for (let k = 0; k < n; k++) { const a = k / n * TAU + Math.PI / 8, r = k % 2 ? Ri : Ro; p.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
  for (let k = 0; k < n; k++) { const A = p[k], B = p[(k + 1) % n], ex = B[0] - A[0], ez = B[1] - A[1], l = Math.hypot(ex, ez); let nx = ez / l, nz = -ex / l; if (nx * ((A[0] + B[0]) / 2 - cx) + nz * ((A[1] + B[1]) / 2 - cz) < 0) { nx = -nx; nz = -nz; }
    mb.quad([A[0], y0, A[1]], [B[0], y0, B[1]], [B[0], y1, B[1]], [A[0], y1, A[1]], [nx, 0, nz], [k / n * tile[0], 0, (k + 1) / n * tile[0], (y1 - y0) / tile[1]], col); }
  if (cap) { const t = mb.vert([cx, y1, cz], [0, 1, 0], .5, .5, col), b0 = mb.n; for (let k = 0; k < n; k++) mb.vert([p[k][0], y1, p[k][1]], [0, 1, 0], .5, .5, col); for (let k = 0; k < n; k++) mb.i.push(t, b0 + k, b0 + (k + 1) % n); }
}
function tcyl(mb, a, b, r0, r1, seg, col) {                            // 倾斜圆柱 (棕榈树干)
  const base = mb.n; for (let k = 0; k <= seg; k++) { const an = k / seg * TAU, c = Math.cos(an), s = Math.sin(an);
    mb.vert([a[0] + c * r0, a[1], a[2] + s * r0], [c, 0, s], k / seg, 1, col); mb.vert([b[0] + c * r1, b[1], b[2] + s * r1], [c, 0, s], k / seg, 0, col); }
  for (let k = 0; k < seg; k++) { const i = base + k * 2; mb.i.push(i, i + 2, i + 1, i + 1, i + 2, i + 3); }
}

/* ---------- 程序化贴图 ---------- */
function makeTex(R, T) {
  const X = {}, P = (w, h, fn, o) => R.paint(w, h, fn, o);
  const dual = (w, h, fn, o) => ({ tex: P(w, h, (g) => fn(g, false), o), em: P(w, h, (g) => fn(g, true), o) });
  const arch = (g, x0, y0, x1, y1) => { const r = (x1 - x0) / 2; g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0, y0 + r); g.arc(x0 + r, y0 + r, r, Math.PI, 0); g.lineTo(x1, y1); g.closePath(); };
  X.side = P(256, 256, (g) => { const r = rnd(3); g.fillStyle = '#a89c8c'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const v = 10 * (r() - .5); g.fillStyle = `rgb(${196 + v},${182 + v},${164 + v})`; g.fillRect(x * 32 + 1, y * 32 + 1, 30, 30); } });
  X.plaza = P(512, 512, (g) => {                                      // 广场地砖: 同心环 + 伊斯兰八角星
    const c = 256, ring = (r, col) => { g.fillStyle = col; g.beginPath(); g.arc(c, c, r, 0, TAU); g.fill(); };
    ring(256, '#5e5a6e'); ring(248, '#e6d7b4'); ring(224, '#9a4a52'); ring(217, '#e6d7b4'); ring(186, '#cdb78c'); ring(150, '#2f7280'); ring(143, '#eadfc4'); ring(112, '#d8c49c');
    g.strokeStyle = 'rgba(90,70,40,.35)'; g.lineWidth = 2; for (let k = 0; k < 72; k++) { const a = k / 72 * TAU; g.beginPath(); g.moveTo(c + Math.cos(a) * 186, c + Math.sin(a) * 186); g.lineTo(c + Math.cos(a) * 217, c + Math.sin(a) * 217); g.stroke(); }
    for (let k = 0; k < 32; k++) { const a = k / 32 * TAU, x = c + Math.cos(a) * 168, y = c + Math.sin(a) * 168; g.fillStyle = k % 2 ? '#e6b84f' : '#9a4a52'; g.save(); g.translate(x, y); g.rotate(a + Math.PI / 4); g.fillRect(-7, -7, 14, 14); g.restore(); }
    const st = (R0, R1, rot, fill, stroke) => { g.beginPath(); for (let k = 0; k < 16; k++) { const a = k / 16 * TAU + rot, r = k % 2 ? R1 : R0; g[k ? 'lineTo' : 'moveTo'](c + Math.cos(a) * r, c + Math.sin(a) * r); } g.closePath(); g.fillStyle = fill; g.fill(); g.strokeStyle = stroke; g.lineWidth = 4; g.stroke(); };
    st(108, 62, 0, '#2f7280', '#e6b84f'); st(78, 44, Math.PI / 8, '#eadfc4', '#9a4a52'); ring(34, '#9a4a52'); ring(26, '#e6b84f');
  });
  X.mall = dual(512, 512, (g, em) => {                                // 商场正面: 石柱 + 大玻璃
    const bay = 128; if (!em) { g.fillStyle = '#e9ddc6'; g.fillRect(0, 0, 512, 512); g.fillStyle = '#8c8272'; g.fillRect(0, 484, 512, 28); g.fillStyle = '#d4c7ac'; g.fillRect(0, 108, 512, 26); g.fillRect(0, 0, 512, 34); } else { g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512); g.fillStyle = '#7ee8ff'; g.fillRect(0, 28, 512, 5); }
    const r = rnd(21);
    for (let i = 0; i < 4; i++) { const x = i * bay + 18, w = bay - 36;
      if (!em) { let gr = g.createLinearGradient(x, 134, x + w, 480); gr.addColorStop(0, '#3f8aa0'); gr.addColorStop(1, '#16405c'); g.fillStyle = gr; g.fillRect(x, 134, w, 346); g.fillStyle = '#1a4a66'; g.fillRect(x, 40, w, 66); g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.moveTo(x, 480); g.lineTo(x + w * .7, 134); g.lineTo(x + w * .95, 134); g.lineTo(x + w * .25, 480); g.fill(); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + w / 2 - 1, 134, 2, 346); }
      else { const gr = g.createLinearGradient(0, 134, 0, 480); gr.addColorStop(0, '#ffd9a0'); gr.addColorStop(1, '#ff9e70'); g.fillStyle = gr; g.globalAlpha = .88; g.fillRect(x, 134, w, 346); g.globalAlpha = 1;
        for (let k = 0; k < 4; k++) { g.fillStyle = ['#fff3d6', '#ffb3d8', '#bfe8ff', '#ffe08a'][(r() * 4) | 0]; g.globalAlpha = .75; g.fillRect(x + 6 + r() * 20, 200 + k * 62, 30 + r() * 40, 38); g.globalAlpha = 1; }
        g.fillStyle = '#9fe8ff'; g.globalAlpha = .8; g.fillRect(x, 40, w, 66); g.globalAlpha = 1; g.fillStyle = '#000'; g.fillRect(x + w / 2 - 1, 134, 2, 346); } }
  });
  X.tier = dual(512, 256, (g, em) => {                                // 上层: 竖鳍 + 玻璃
    if (!em) { g.fillStyle = '#2d6f86'; g.fillRect(0, 0, 512, 256); for (let k = 0; k < 24; k++) { g.fillStyle = '#f3ecdc'; g.fillRect(k * 21.3, 0, 7, 256); } g.fillStyle = 'rgba(255,255,255,.18)'; for (let j = 0; j < 4; j++) g.fillRect(0, j * 64 + 58, 512, 6); }
    else { g.fillStyle = '#000'; g.fillRect(0, 0, 512, 256); const r = rnd(8); for (let j = 0; j < 4; j++) for (let k = 0; k < 24; k++) { if (r() < .28) continue; g.fillStyle = ['#ffe3a8', '#ffcf8a', '#c8f1ff'][(r() * 3) | 0]; g.fillRect(k * 21.3 + 8, j * 64 + 8, 13, 46); } }
  });
  X.door = dual(256, 256, (g, em) => {                                // 大门玻璃
    if (!em) { g.fillStyle = '#16384f'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#e8edf5'; for (let i = 0; i <= 4; i++) g.fillRect(i * 64 - 3, 0, 6, 256); g.fillRect(0, 0, 256, 8); g.fillRect(0, 100, 256, 5); }
    else { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#ffe6b0'); gr.addColorStop(1, '#ffb070'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); g.fillStyle = '#000'; for (let i = 0; i <= 4; i++) g.fillRect(i * 64 - 3, 0, 6, 256); g.fillRect(0, 100, 256, 5); }
  });
  X.shop = (seed, wall, shut) => dual(256, 512, (g, em) => {          // 马来西亚排屋 (五脚基 + 百叶窗)
    const r = rnd(seed); g.fillStyle = em ? '#000' : wall; g.fillRect(0, 0, 256, 512);
    if (!em) { g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(0, 0, 256, 46); g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(0, 46, 256, 6); for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(26 + i * 51, 28, 14, Math.PI, 0); g.fill(); } g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(0, 306, 256, 8); }
    [[74, 176], [196, 298]].forEach(([y0, y1]) => [[30, 100], [156, 226]].forEach(([x0, x1]) => { arch(g, x0, y0, x1, y1);
      if (em) { if (r() < .6) { g.fillStyle = ['#ffd98a', '#ffc766', '#ffe9b8'][(r() * 3) | 0]; g.fill(); g.fillStyle = '#000'; g.fillRect(x0 + (x1 - x0) / 2 - 1, y0, 2, y1 - y0); } }
      else { g.fillStyle = '#f6f1e4'; g.fill(); const m = 6; arch(g, x0 + m, y0 + m, x1 - m, y1 - m); g.fillStyle = '#1c2236'; g.fill(); g.fillStyle = shut; g.fillRect(x0 + m, y0 + 28, 15, y1 - y0 - 28 - m); g.fillRect(x1 - m - 15, y0 + 28, 15, y1 - y0 - 28 - m); g.fillStyle = 'rgba(0,0,0,.25)'; for (let l = y0 + 34; l < y1 - 10; l += 7) { g.fillRect(x0 + m, l, 15, 2); g.fillRect(x1 - m - 15, l, 15, 2); } } }));
    g.fillStyle = em ? '#000' : shut; g.fillRect(0, 320, 256, 36);
    if (em) { g.fillStyle = '#ffdca0'; g.fillRect(10, 326, 236, 24); }
    [[20, 120], [138, 236]].forEach(([x0, x1]) => { arch(g, x0, 372, x1, 512); if (em) { const gr = g.createLinearGradient(0, 372, 0, 512); gr.addColorStop(0, '#ffcf8a'); gr.addColorStop(1, '#ff9e60'); g.fillStyle = gr; g.fill(); } else { g.fillStyle = '#2a1f26'; g.fill(); g.strokeStyle = '#f6f1e4'; g.lineWidth = 7; g.stroke(); } });
    g.fillStyle = em ? '#000' : '#f6f1e4'; g.fillRect(118, 360, 22, 152);
  });
  X.tower = dual(256, 256, (g, em) => {                               // 双子塔不锈钢幕墙
    if (!em) { const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, '#9aa7bd'); gr.addColorStop(.5, '#dfe6f2'); gr.addColorStop(1, '#8794ac'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); g.fillStyle = 'rgba(30,50,90,.55)'; for (let j = 0; j < 16; j++) g.fillRect(0, j * 16 + 4, 256, 8); }
    else { g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256); const r = rnd(14); for (let j = 0; j < 16; j++) for (let k = 0; k < 8; k++) { if (r() < .35) continue; g.fillStyle = r() < .8 ? '#ffe2a8' : '#cfeaff'; g.fillRect(k * 32 + 3, j * 16 + 4, 26, 8); } }
  });
  X.awn = P(64, 64, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f6efe2' : '#d8362f'; g.fillRect(i * 8, 0, 8, 64); } });
  X.awn2 = P(64, 64, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f6efe2' : '#1f8a5b'; g.fillRect(i * 8, 0, 8, 64); } });
  X.board = dual(512, 320, (g, em) => {                               // 合影看板
    g.fillStyle = em ? '#000' : '#fff4e0'; g.fillRect(0, 0, 512, 320); g.strokeStyle = em ? '#ffb347' : '#e0452f'; g.lineWidth = 14; g.strokeRect(10, 10, 492, 300);
    const tw = (x, c) => { g.fillStyle = c; g.fillRect(x, 70, 30, 150); g.fillRect(x + 8, 40, 14, 40); g.fillRect(x + 12, 20, 6, 24); };
    tw(350, em ? '#ffd27a' : '#9fb0cc'); tw(404, em ? '#ffd27a' : '#9fb0cc'); g.fillStyle = em ? '#ffd27a' : '#9fb0cc'; g.fillRect(380, 120, 24, 10);
    g.font = '800 92px "Arial Black",Arial,sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = em ? '#ff6a7a' : '#e0452f'; g.fillText('I ♥ KL', 40, 100);
    g.font = '700 38px "PingFang SC","Noto Sans SC",sans-serif'; g.fillStyle = em ? '#ffe7b0' : '#4a3a30'; g.fillText('吉隆坡 · 合影点', 40, 200); g.font = '600 26px Arial'; g.fillText('Selamat Datang!', 40, 252);
  }, { clamp: true });
  X.led = dual(512, 256, (g, em) => {                                 // 商场 LED 大屏
    const gr = g.createLinearGradient(0, 0, 512, 256); gr.addColorStop(0, '#ff4f9a'); gr.addColorStop(.5, '#7a4cff'); gr.addColorStop(1, '#ffb13b'); g.fillStyle = em ? gr : '#120d24'; g.fillRect(0, 0, 512, 256); g.fillStyle = em ? 'rgba(0,0,0,.2)' : '#000'; g.fillRect(0, 0, 512, 256);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.shadowColor = '#ffd0f0'; g.shadowBlur = em ? 24 : 0; g.font = '800 78px "Arial Black",Arial,sans-serif'; g.fillText('SALE 70%', 256, 92); g.font = '700 44px "PingFang SC","Noto Sans SC",sans-serif'; g.shadowBlur = 0; g.fillText('武吉免登 · 年终大促', 256, 182);
  }, { clamp: true });
  return X;
}

/* =====================================================================
   BUKIT BINTANG PAVILION PLAZA
   ===================================================================== */
function makeBukit(R, T) {
  R.gl.bindVertexArray(null);   // 防止创建网格时误改当前绑定的 VAO（如角色模型）
  const X = makeTex(R, T), S = { batches: [], obstacles: [], portals: [], hotspots: [], lamps: [] };
  const add = (mb, mat) => { if (mb.i.length) S.batches.push(R.batch(mb, mat)); };
  const obs = (a, b, c, d) => S.obstacles.push({ x0: a, z0: b, x1: c, z1: d });
  const solid = (r, g, b) => R.solidTex([r, g, b, 255]);
  const emS = (hx, d, n) => { const c = hex(hx); return { em: solid(c[0] * 255, c[1] * 255, c[2] * 255), emDay: d, emNight: n }; };
  const obsRot = (cx, cz, w, d, yaw) => { const c = Math.cos(yaw), s = Math.sin(yaw), n = Math.max(1, Math.ceil(w / 1.8)), hx = Math.abs(c) * (w / n / 2 + .3) + Math.abs(s) * d / 2, hz = Math.abs(s) * (w / n / 2 + .3) + Math.abs(c) * d / 2;
    for (let k = 0; k < n; k++) { const lx = -w / 2 + (k + .5) * w / n, x = cx + lx * c, z = cz - lx * s; obs(x - hx, z - hz, x + hx, z + hz); } };
  const plain = new MB(), awn = new MB(), awn2 = new MB(), bulbs = new MB(), glow = new MB(), leaf = new MB(), steam = new MB();
  const signAt = (text, o, cx, cz, yaw, y0, y1, w, dn, nn) => { const sg = T.sign(text, o), mb = new MB(); rbox(mb, cx, cz, w, .2, y0, y1, yaw, [1, 1, 1], [w, y1 - y0], { noBack: true, noSides: true, noTop: true }); add(mb, { tex: sg.tex, em: sg.em, emDay: dn == null ? .6 : dn, emNight: nn == null ? 1.7 : nn }); };

  /* ---- 地面 ---- */
  { const mb = new MB(); mb.floor(-170, -150, 170, 120, 0, [.86, .78, .7], [0, 0, 340 / 8, 270 / 8]); add(mb, { tex: X.side }); }
  { const mb = new MB(); mb.floor(-170, 27, 170, 41, .012, [.15, .15, .19]); for (let x = -120; x < 120; x += 6) mb.floor(x, 33.8, x + 3, 34.2, .02, [.95, .85, .4]); mb.floor(-170, 26.2, 170, 27, .02, [.8, .8, .85]); mb.floor(-170, 41, 170, 41.8, .02, [.8, .8, .85]);
    for (let k = -6; k <= 6; k++) mb.floor(k * 1.3 - .45, 27.2, k * 1.3 + .45, 40.8, .022, [.93, .93, .95]); add(mb, {}); }        // 马路 + 斑马线
  { const mb = new MB(); mb.disc(CX, CZ, .03, 19, 72, [1, 1, 1]); add(mb, { tex: X.plaza });
    const cb = new MB(); cb.cyl(CX, CZ, 0, .14, 19.35, 19.35, 72, [.78, .72, .62]); cb.disc(CX, CZ, .14, 19.35, 72, [.84, .78, .68], 19); add(cb, {});
    const gr = new MB(); [[-15, 25.5, 4.6], [15, 25.5, 4.6], [-29, 14, 4.4], [29, 14, 4.4], [-8, 30, 0]].forEach(([x, z, r]) => { if (r) { gr.disc(x, z, .05, r, 28, [.36, .66, .38]); gr.disc(x, z, .07, r * .72, 24, [.42, .74, .42]); } }); add(gr, {}); }

  /* ---- Pavilion 商场 (弧形, 三层退台) ---- */
  const MCx = 0, MCz = 14, A = .95;
  { const mb = new MB(); arcWall(mb, MCx, MCz, 32, -A, A, 0, 8, 40, [12, 8]); add(mb, { tex: X.mall.tex, em: X.mall.em, emDay: .35, emNight: 1.55 });
    const t2 = new MB(); arcWall(t2, MCx, MCz, 35.5, -A, A, 8, 12.4, 36, [12, 5]); add(t2, { tex: X.tier.tex, em: X.tier.em, emDay: .2, emNight: 1.5 });
    const t3 = new MB(); arcWall(t3, MCx, MCz, 39, -A, A, 12.4, 14.4, 32, [12, 4]); add(t3, { tex: X.tier.tex, em: X.tier.em, emDay: .2, emNight: 1.4 });
    const rf = new MB(); arcFloor(rf, MCx, MCz, 32, 35.5, -A, A, 8, 36, [.62, .6, .58]); arcFloor(rf, MCx, MCz, 35.5, 39, -A, A, 12.4, 36, [.62, .6, .58]); arcFloor(rf, MCx, MCz, 39, 52, -A, A, 14.4, 30, [.5, .5, .55]); add(rf, {});
    const ed = new MB(); for (const [R0, y] of [[32, 8], [35.5, 12.4], [39, 14.4]]) { arcWall(ed, MCx, MCz, R0 - .05, -A, A, y, y + .35, 40, [1e3, 1e3], [.95, .93, .88]); } add(ed, {});
    const neon = new MB(); for (const [R0, y] of [[31.9, 7.6], [35.4, 12], [38.9, 14]]) arcWall(neon, MCx, MCz, R0, -A, A, y, y + .12, 40, [1e3, 1e3], [.1, .1, .1]); add(neon, emS('#7ee8ff', .9, 2.6));
    for (let a = -A; a < A; a += .07) { const p = [MCx + 32.6 * Math.sin(a), MCz - 32.6 * Math.cos(a)]; obs(p[0] - 1.5, p[1] - 5, p[0] + 1.5, p[1] + .4); }
    // 大门 + 雨棚 (porte-cochère)
    const d = new MB(); d.quad([-6, 0, -17.35], [6, 0, -17.35], [6, 5.2, -17.35], [-6, 5.2, -17.35], [0, 0, 1], [0, 0, 3, 1], [1, 1, 1]); add(d, { tex: X.door.tex, em: X.door.em, emDay: .6, emNight: 1.4 });
    const ca = new MB(); ca.box(-7.2, 4.35, -17.4, 7.2, 5.75, -11.8, [.1, .08, .06]); [-6.6, -2.2, 2.2, 6.6].forEach(x => ca.cyl(x, -12.3, 0, 5.2, .32, .32, 12, [.93, .9, .83])); add(ca, {});
    const cl = new MB(); cl.box(-7.25, 5.65, -17.45, 7.25, 5.8, -11.75, [.1, .1, .1]); add(cl, emS('#ffd27a', .9, 2.4));
    signAt('PAVILION KUALA LUMPUR', { w: 1536, h: 150, fs: 100, bg: '#2a1a0a', fg: '#ffe9b8', border: '#e6b84f' }, 0, -11.79, 0, 4.42, 5.68, 14.2, .9, 1.9);
    const cc = new MB(); [-6.6, -2.2, 2.2, 6.6].forEach(x => obs(x - .5, -12.8, x + .5, -11.8)); S.portals.push({ id: 'pavilion', x: 0, z: -14.2, r: 2.6, label: 'Pavilion KL · 商场', color: [1, .8, .4] });
    const g1 = new MB(); pool(g1, 0, -13.5, 8, [1, .8, .5]); halo(g1, 0, 3, -17, 9, [1, .85, .55]); add(g1, { tex: T.glow, mode: 2, glow: e => .15 + e.night * .6 });
    const rc = new MB(); rc.floor(-5.5, -17.3, 5.5, -9.5, .05, [.7, .1, .16]); add(rc, {});
    // 招牌 + LED 屏 (弧形)
    const sg = T.sign('PAVILION KUALA LUMPUR', { w: 1024, h: 150, fs: 62, bg: '#2a1a0a', fg: '#ffe9b8', border: '#e6b84f' }), sb = new MB(); /* 招牌已移到雨棚横梁 */
    const lb = new MB(); arcWall(lb, MCx, MCz, 31.9, .42, .66, 1.8, 6.6, 8, [31.9 * .24, 4.8]); add(lb, { tex: X.led.tex, em: X.led.em, emDay: 1, emNight: 1.7 });
    const lb2 = new MB(); arcWall(lb2, MCx, MCz, 31.9, -.66, -.42, 1.8, 6.6, 8, [31.9 * .24, 4.8]); add(lb2, { tex: X.led.tex, em: X.led.em, emDay: 1, emNight: 1.7 });
    // 两端圆柱角楼
    [-1, 1].forEach(sd => { const cx = sd * 27.6, cz = -2.7, m = new MB(); m.cyl(cx, cz, 0, 13, 3.8, 3.5, 28, [1, 1, 1], true); add(m, { tex: X.tier.tex, em: X.tier.em, emDay: .2, emNight: 1.5 }); const r2 = new MB(); r2.cyl(cx, cz, 13, 13.6, 4, 4, 28, [.9, .88, .84], true); add(r2, {}); obs(cx - 3.9, cz - 3.9, cx + 3.9, cz + 3.9); });
  }

  /* ---- 双子塔 + KL 塔 + 天际线 (远景, 不可走) ---- */
  { const tw = new MB(), cap = new MB(); const tiers = [[0, 18.4, 2.5, 1.78], [18.4, 28.8, 2.3, 1.63], [28.8, 36.2, 1.95, 1.38], [36.2, 42.5, 1.55, 1.13], [42.5, 47.2, 1.15, .85], [47.2, 49.7, .78, .58]];
    [[41, -108], [53, -108]].forEach(([x, z]) => { tiers.forEach(([y0, y1, ro, ri]) => star(tw, x, z, y0, y1, ro, ri, [1, 1, 1], [4, 6], y1 === 49.7)); cap.cyl(x, z, 49.7, 58, .22, .04, 8, [.9, .92, 1]); });
    tw.box(43.4, 38, -108.9, 50.6, 41.8, -107.1, [.8, .86, .95], [2, 2]); add(tw, { tex: X.tower.tex, em: X.tower.em, emDay: .4, emNight: 1.6 }); add(cap, {});
    const gl = new MB(); [[41, 50], [53, 50]].forEach(([x, y]) => halo(gl, x, y + 1, -107, 8, [1, .95, .8])); [[41, 2], [53, 2]].forEach(([x, y]) => { halo(gl, x, 12, -104, 11, [.5, .7, 1]); }); add(gl, { tex: T.glow, mode: 2, glow: e => e.night * .75 });
    // KL Tower
    const k = new MB(); k.cyl(-50, -100, 0, 21, 1.5, .8, 14, [.85, .87, .92]); k.cyl(-50, -100, 20, 23.5, 2.7, 3.1, 18, [.7, .74, .82]); k.cyl(-50, -100, 23.5, 25, 3.1, 1.4, 18, [.8, .82, .9]); k.cyl(-50, -100, 25, 36, .55, .1, 8, [.85, .86, .9]); add(k, {});
    const ke = new MB(); ke.cyl(-50, -100, 21.3, 22.2, 2.95, 2.95, 18, [.1, .1, .1]); add(ke, emS('#9fe8ff', .3, 2.2));
    const sk = [T.facade(41, { wall: '#9ea6c4', cols: 4, rows: 9, lit: .5 }), T.facade(42, { wall: '#b6a9c9', cols: 4, rows: 9, lit: .42 }), T.facade(43, { wall: '#8c9bb8', cols: 4, rows: 8, lit: .55 })], r = rnd(77);   // 其他天际线
    for (let i = 0; i < 46; i++) { const th = -1.8 + i / 45 * 3.6 + (r() - .5) * .05, rr = 84 + r() * 46, [x, z] = polar(rr, th), w = 7 + r() * 8, h = 12 + r() * 15, f = sk[i % 3];
      if ((x > 34 && x < 60 && z < -90) || (x > -57 && x < -43 && z < -90)) continue; const mb = new MB(); rbox(mb, x, z, w, 9, 0, h, -th, [1, 1, 1], [16, 14], { noTop: true }); add(mb, { tex: f.tex, em: f.em, emNight: 1.5 }); const rf = new MB(); rbox(rf, x, z, w + .2, 9.2, h, h + .5, -th, [.3, .28, .38]); add(rf, {}); }
  }

  /* ---- 左侧: 排屋 (放射状) + 夜市小贩 ---- */
  { const pals = [['#f2b6a0', '#2e7d6b'], ['#a8d5e2', '#c0392b'], ['#f6e0a0', '#2c6aa0'], ['#d9b8e6', '#2f7d4f'], ['#f5c4d3', '#2c5f8a'], ['#b8e0b0', '#a04a3a'], ['#f6c9a0', '#3a6a9a']];
    const tx = pals.map((p, i) => X.shop(30 + i * 7, p[0], p[1]));
    for (let i = 0; i < 7; i++) { const th = -1.28 - i * .205, [x, z] = polar(27.5, th), yaw = -th, mb = new MB(); rbox(mb, x, z, 5.6, 8, 0, 9.6, yaw, [1, 1, 1], [5.6, 9.6], { noTop: true }); add(mb, { tex: tx[i].tex, em: tx[i].em, emDay: .15, emNight: 1.5 });
      const rf = new MB(); rbox(rf, x, z, 5.8, 8.2, 9.6, 10.15, yaw, [.62, .3, .26]); rbox(rf, x, z, 6, 8.4, 10.15, 10.4, yaw, [.5, .26, .24]); add(rf, {}); obsRot(x, z, 5.6, 8, yaw); }
  }
  const stall = (x, z, yaw, name, sigO, aw, hotId, label, icon, col) => {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    rbox(plain, x, z, 3.2, 1.3, 0, .95, yaw, [.78, .52, .3]); rbox(plain, x, z, 3.3, 1.4, .95, 1.05, yaw, [.95, .93, .9]); rbox(plain, x - s * .55, z - c * .55, 3.2, .2, 1.05, 2.5, yaw, [.3, .26, .24], null, { noTop: false });
    [[-1.5, .6], [1.5, .6]].forEach(([lx, lz]) => { const px = x + lx * c + lz * s, pz = z - lx * s + lz * c; plain.cyl(px, pz, 0, 2.5, .05, .05, 6, [.25, .22, .22]); });
    const a = new MB(); rbox(aw === 2 ? awn2 : awn, x + s * .25, z + c * .25, 3.9, 2.1, 2.4, 2.55, yaw, [1, 1, 1], [.7, .7]);
    for (let k = 0; k < 8; k++) { const lx = -1.85 + k * .53, bx = x + lx * c + 1.25 * s, bz = z - lx * s + 1.25 * c; bulbs.box(bx - .06, 2.22, bz - .06, bx + .06, 2.34, bz + .06, [.12, .1, .05]); }
    for (let k = 0; k < 4; k++) { const lx = -1.2 + k * .8, fx = x + lx * c + .1 * s, fz = z - lx * s + .1 * c; plain.box(fx - .22, 1.05, fz - .16, fx + .22, 1.3, fz + .16, [[.9, .35, .2], [.95, .8, .3], [.5, .75, .35], [.9, .55, .6]][k]); }
    halo(steam, x, 1.9, z + 0, 2.6, [1, .8, .5]); pool(glow, x + s * 1.2, z + c * 1.2, 2.2, [1, .72, .4]);
    signAt(name, sigO, x - s * .62 + s * .0, z - c * .62, yaw, 1.5, 2.3, 3.0, .5, 1.8);
    const tb = [[-1.1, 2.7], [1.1, 2.9]]; tb.forEach(([lx, lz]) => { const px = x + lx * c + lz * s, pz = z - lx * s + lz * c; plain.cyl(px, pz, 0, .72, .55, .55, 12, [.85, .83, .8], true); [[-.6, 0], [.6, 0], [0, .6], [0, -.6]].forEach(([a2, b2]) => plain.cyl(px + a2, pz + b2, 0, .42, .22, .2, 8, [.82, .15, .15], true)); obs(px - .9, pz - .9, px + .9, pz + .9); });
    obsRot(x, z, 3.4, 1.8, yaw);
    if (hotId) S.hotspots.push({ id: hotId, x: x + s * 1.9, z: z + c * 1.9, r: 1.6, label, icon, color: col });
  };
  { const defs = [['TEH TARIK 拉茶', { w: 512, h: 120, fs: 56, bg: '#3a1a10', fg: '#ffe0b0', border: '#ff9a4a' }, 1, 'teh', '拉茶摊', '🥤', [1, .7, .3]], ['SATAY 沙爹', { w: 512, h: 120, fs: 62, bg: '#2a1408', fg: '#ffd9a0', border: '#e0452f' }, 2, 'satay', '沙爹摊', '🍢', [1, .5, .3]], ['DURIAN 榴莲', { w: 512, h: 120, fs: 56, bg: '#1d3a12', fg: '#f6f08a', border: '#8fd14f' }, 2, 'durian', '榴莲摊', '🍈', [.7, 1, .4]], ['ROTI CANAI', { w: 512, h: 120, fs: 56, bg: '#2a1a0a', fg: '#fff0c8', border: '#e6b84f' }, 1, 'roti', '印度煎饼', '🥞', [1, .85, .4]]];
    defs.forEach((d, i) => { const th = -1.42 - i * .34, [x, z] = polar(21.2, th); stall(x, z, -th, d[0], d[1], d[2], d[3], d[4], d[5], d[6]); }); }

  /* ---- 右侧: 现代商业楼 + 单轨站 + 车站 ---- */
  { const fa = [T.facade(51, { wall: '#c3b8d8', glass: ['#5d86b8', '#3b5a86'], cols: 5, rows: 6, lit: .5 }), T.facade(52, { wall: '#9eb0d0', cols: 5, rows: 5, lit: .55 }), T.facade(53, { wall: '#d6c7a8', glass: ['#7aa6c8', '#3d6a94'], cols: 4, rows: 6, lit: .6 })];
    [[1.3, 8.6, 11, 0], [1.56, 8.6, 13.5, 1], [1.82, 8.6, 10, 2], [2.3, 7.8, 9, 0], [2.58, 7.8, 11.5, 1]].forEach(([th, d, h, f], i) => { const [x, z] = polar(27.5, th), yaw = -th, mb = new MB(); rbox(mb, x, z, 7, d, 0, h, yaw, [1, 1, 1], [8, 7], { noTop: true }); add(mb, { tex: fa[f].tex, em: fa[f].em, emDay: 0, emNight: 1.5 }); const rf = new MB(); rbox(rf, x, z, 7.3, d + .3, h, h + .5, yaw, [.3, .28, .38]); add(rf, {}); obsRot(x, z, 7, d, yaw); });
    // 单轨车站 (入口牌 + 高架 + 列车)
    const th = 2.02, [sx, sz] = polar(23.8, th), yaw = -th, st = new MB();
    rbox(st, sx, sz, 5, 4, 0, 3.6, yaw, [.92, .92, .96]); rbox(st, sx, sz, 5.6, 4.6, 3.6, 3.95, yaw, [.8, .12, .16]); add(st, {}); obsRot(sx, sz, 5, 4, yaw);
    signAt('MONORAIL 单轨', { w: 512, h: 120, fs: 56, bg: '#8a1018', fg: '#fff', border: '#ffd0d4' }, sx + Math.sin(yaw) * 2.05, sz + Math.cos(yaw) * 2.05, yaw, 2.2, 3.3, 3.6, .7, 1.7);
    const vi = new MB(); for (let k = 0; k < 9; k++) { const t = k * 7.5, x = sx + 3 + t * .86, z = sz - 1 - t * .5; rbox(vi, x, z, 8.4, 1.9, 8.1, 9.3, -.52, [.82, .82, .86]); vi.cyl(x, z, 0, 8.1, .55, .45, 10, [.76, .76, .8]); obs(x - .6, z - .6, x + .6, z + .6); }
    add(vi, {});
    const tr = new MB(); [0, 1, 2].forEach(k => { const t = 10 + k * 5.1, x = sx + 3 + t * .86, z = sz - 1 - t * .5; rbox(tr, x, z, 4.8, 2.5, 9.35, 11.3, -.52, [.96, .96, .98]); rbox(tr, x, z, 4.82, 2.52, 9.7, 10.2, -.52, [.82, .1, .16]); }); add(tr, {});
    const tw = new MB(); [0, 1, 2].forEach(k => { const t = 10 + k * 5.1, x = sx + 3 + t * .86, z = sz - 1 - t * .5; rbox(tw, x, z, 4.4, 2.56, 10.4, 11.0, -.52, [.1, .1, .1]); }); add(tw, emS('#ffe6a8', .5, 1.6));
    S.portals.push({ id: 'plaza', x: sx + Math.sin(yaw) * 3.5, z: sz + Math.cos(yaw) * 3.5, r: 1.9, label: '单轨列车 · 回星光广场', color: [1, .35, .4], spawn: [19.5, -2.6] });
  }

  /* ---- 喷泉 (广场中心) ---- */
  { const f = new MB(); f.cyl(CX, CZ, 0, .75, 3.7, 3.7, 40, [.86, .82, .76]); f.disc(CX, CZ, .75, 3.7, 40, [.9, .86, .8], 3.2); f.cyl(CX, CZ, .1, .6, 3.2, 3.2, 40, [.4, .5, .6]); f.cyl(CX, CZ, .55, 2.6, .4, .22, 12, [.9, .88, .82], true); f.cyl(CX, CZ, 1.3, 1.5, 1.4, 1.4, 20, [.9, .88, .82], true); f.sphere(CX, 2.9, CZ, .55, .8, .55, [.7, .9, 1], 10); add(f, {});
    const w = new MB(); w.disc(CX, CZ, .55, 3.2, 40, [.5, .75, .95]); add(w, emS('#4aa8ff', .25, .9));
    const g = new MB(); halo(g, CX, 2.2, CZ, 5.5, [.5, .8, 1]); pool(g, CX, CZ, 5.5, [.4, .7, 1], .06); add(g, { tex: T.glow, mode: 2, glow: e => .1 + e.night * .55 });
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; leaf.sphere(CX + Math.cos(a) * 1.2, 1.7, CZ + Math.sin(a) * 1.2, .14, .5, .14, [.7, .9, 1], 5); }
    obs(CX - 3.9, CZ - 3.9, CX + 3.9, CZ + 3.9); S.hotspots.push({ id: 'fountain', x: CX, z: CZ + 5.2, r: 2.0, label: '许愿喷泉', icon: '⛲', color: [.5, .8, 1] }); }

  /* ---- 合影点 (I ♥ KL) / 街头艺人 ---- */
  { const bx = 13.6, bz = 11.4, yaw = -.5; rbox(plain, bx, bz, .2, .3, 0, 2.6, yaw, [.3, .26, .3]);
    const mb = new MB(); rbox(mb, bx, bz, 4.2, .2, 1.1, 3.8, yaw, [1, 1, 1], [4.2, 2.7], { noBack: false, noSides: true, noTop: true }); add(mb, { tex: X.board.tex, em: X.board.em, emDay: .3, emNight: 1.3 });
    const lg = [[-1.8, 0], [1.8, 0]]; lg.forEach(([lx]) => rbox(plain, bx + lx * Math.cos(yaw), bz - lx * Math.sin(yaw), .16, .16, 0, 1.2, yaw, [.3, .26, .3])); obsRot(bx, bz, 4.2, .6, yaw);
    pool(glow, bx + Math.sin(yaw) * 2.2, bz + Math.cos(yaw) * 2.2, 2.2, [1, .8, .5]); for (let k = 0; k < 3; k++) plain.floor(bx + Math.sin(yaw) * (1.5 + k * .5) - .15, bz + Math.cos(yaw) * (1.5 + k * .5) - .15, bx + Math.sin(yaw) * (1.5 + k * .5) + .15, bz + Math.cos(yaw) * (1.5 + k * .5) + .15, .07, [.9, .3, .3]);
    S.hotspots.push({ id: 'photo', x: bx + Math.sin(yaw) * 2.6, z: bz + Math.cos(yaw) * 2.6, r: 1.6, label: '合影', icon: '📸', color: [1, .6, .5] });
    const ux = -9.5, uz = 13.5; plain.cyl(ux, uz, 0, .08, 1.5, 1.5, 24, [.55, .1, .22], true); plain.box(ux + 1.6, 0, uz - .1, ux + 2.1, .6, uz + .4, [.15, .12, .14]); plain.cyl(ux - .3, uz - .5, 0, .6, .32, .26, 8, [.35, .2, .12], true);
    const bk = new MB(); pool(bk, ux, uz, 3, [1, .7, .5]); add(bk, { tex: T.glow, mode: 2, glow: e => .15 + e.night * .35 }); obs(ux + 1.5, uz - .2, ux + 2.2, uz + .5);
    S.hotspots.push({ id: 'busker', x: ux, z: uz + .6, r: 1.7, label: '街头艺人', icon: '🎸', color: [1, .5, .7] }); }

  /* ---- 路灯 + 灯串 ---- */
  { const poles = new MB(), heads = new MB(), halos = new MB(), pools = new MB(), pts = {};
    [-2.55, -2.05, -1.55, -1.05, -.55, .55, 1.05, 1.55, 2.05, 2.55].forEach((th, i) => { const [x, z] = polar(18.3, th), h = 4.5; pts[th] = [x, z, h];
      poles.cyl(x, z, 0, h, .09, .06, 8, [.2, .18, .3]); poles.cyl(x, z, 0, .35, .2, .14, 8, [.2, .18, .3]); heads.sphere(x, h + .12, z, .3, .3, .3, [1, 1, 1], 8); halo(halos, x, h + .12, z, 3.4, [1, .8, .45]); pool(pools, x, z, 3.6, [1, .78, .45]); obs(x - .22, z - .22, x + .22, z + .22); S.lamps.push([x, z]); });
    add(poles, {}); add(heads, emS('#fff0c8', .35, 2.4)); add(halos, { tex: T.glow, mode: 2, glow: e => e.night * .8 + .08 }); add(pools, { tex: T.glow, mode: 2, glow: e => e.night * .24 });
    const str = (a, b, sag, n) => { for (let k = 1; k < n; k++) { const t = k / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, y = a[2] + (b[2] - a[2]) * t - Math.sin(t * Math.PI) * sag; bulbs.box(x - .06, y - .06, z - .06, x + .06, y + .06, z + .06, [.12, .1, .05]); } };
    const ks = Object.keys(pts).map(Number).sort((a, b) => a - b); for (let i = 0; i + 1 < ks.length; i++) if (ks[i + 1] - ks[i] < .6) str(pts[ks[i]], pts[ks[i + 1]], .7, 12);
    [[-2.05, 2.05], [-1.55, 1.55], [-1.05, 1.05]].forEach(([a, b]) => str(pts[a], pts[b], 1.3, 30)); }
  add(bulbs, emS('#ffe2a0', 1, 3)); add(awn, { tex: X.awn }); add(awn2, { tex: X.awn2 }); add(steam, { tex: T.glow, mode: 2, glow: e => .12 + e.night * .45 }); add(glow, { tex: T.glow, mode: 2, glow: e => .06 + e.night * .35 });

  /* ---- 棕榈树 / 雨树 / 灌木花 ---- */
  { const r = rnd(5), palm = (x, z, h, lean) => {
      for (let k = 0; k < 6; k++) { const t0 = k / 6, t1 = (k + 1) / 6, a = [x + lean * t0 * t0 * h, t0 * h, z], b = [x + lean * t1 * t1 * h, t1 * h, z]; tcyl(plain, a, b, .26 - t0 * .1, .26 - t1 * .1, 8, [.5 + .08 * (k % 2), .38, .28]); }
      const cx = x + lean * h, cy = h, n = 9; for (let i = 0; i < n; i++) { const an = i / n * TAU + r() * .4, L = 2.5 + r() * .8, dx = Math.cos(an), dz = Math.sin(an), px = -dz, pz = dx, g = [.2 + r() * .1, .55 + r() * .15, .26 + r() * .08];
        const pt = (t, w) => { const o = t * L, y = cy + Math.sin(t * 2.6) * .7 - t * t * 1.2; return [[cx + dx * o - px * w, y, z + dz * o - pz * w], [cx + dx * o + px * w, y, z + dz * o + pz * w]]; };
        let prev = pt(0, .05); for (let s2 = 1; s2 <= 4; s2++) { const t = s2 / 4, w = .55 * Math.sin(Math.min(1, t * 1.15) * Math.PI * .85 + .3) * (1 - t * .55), cur = pt(t, Math.max(.04, w)); leaf.quad(prev[0], prev[1], cur[1], cur[0], [0, 1, 0], [0, 0, 1, 1], g); prev = cur; } }
      leaf.sphere(cx, cy - .15, z, .3, .25, .3, [.45, .32, .2], 6); obs(x - .3, z - .3, x + .3, z + .3); };
    [[-24.5, 11.5, 9, .05], [24.5, 12.5, 9, -.05], [-13, 20.5, 7.5, -.04], [13, 20.5, 8, .05], [-6, -10, 7.5, .05], [6, -10.5, 8, -.05], [-16, -9, 8.5, -.04], [16, -9, 8, .05]].forEach(p => palm(...p));
    [[-30, 5], [30, 3]].forEach(([x, z], i) => { plain.cyl(x, z, 0, 3.4, .45, .3, 8, [.4, .3, .22]); [[0, 0, 3.2, 2.4], [1.8, .8, 2.4, 1.8], [-1.8, -.6, 2.5, 1.9], [.3, 1.8, 2.2, 1.7]].forEach(([dx, dz, rx, ry]) => leaf.sphere(x + dx, 4.4 + dz * .3, z + dz, rx, ry * .6, rx * .9, [.24 + (i * .04), .56, .32], 9)); obs(x - .5, z - .5, x + .5, z + .5); });
    const fl = [[.95, .25, .5], [.95, .45, .2], [.85, .2, .35], [1, .75, .2]];
    for (let i = 0; i < 14; i++) { const th = 2.5 + i * .16 + (i > 11 ? .2 : 0), a = th > 3.9 ? th : th, [x, z] = polar(20.8, th % 6.283 > 3.5 ? th : th); if (Math.abs(x) < 4.5 && z > 22) continue; if (z > 26 || z < -14) continue; leaf.sphere(x, .42, z, .55, .38, .55, [.28 + r() * .06, .62, .34], 7); leaf.sphere(x + .15, .66, z - .1, .4, .28, .4, fl[i % 4], 6); obs(x - .6, z - .6, x + .6, z + .6); }
    for (let k = 0; k < 6; k++) { const x = -12 + k * 4.8; if (Math.abs(x) < 2.4) continue; leaf.sphere(x, .4, 25.6, .6, .36, .6, [.3, .62, .36], 7); leaf.sphere(x, .64, 25.6, .4, .26, .4, fl[k % 4], 6); obs(x - .9, 24.8, x + .9, 26.4); } add(plain, {}); add(leaf, {}); }

  /* ---- 长椅 ---- */
  { const bm = new MB(); [[-5.5, 8.4, .5], [5.5, 8.4, -.5], [-9, -1.5, 1.2], [9, -1.5, -1.2]].forEach(([x, z, y]) => { rbox(bm, x, z, 2.2, .7, .45, .55, y, [.55, .38, .26]); rbox(bm, x - Math.sin(y) * .32, z - Math.cos(y) * .32, 2.2, .1, .55, 1.1, y, [.5, .34, .24]); obsRot(x, z, 2.2, .8, y); }); add(bm, {}); }

  S.bounds = { x0: -31, x1: 31, z0: -14.4, z1: 23 }; S.spawn = [0, 9];
  S.camera = { dist: 27, pitch: 0.5, fov: 0.74, clampX: [-12, 12], clampZ: [-7, 6], lead: 4 };   // 与原游戏相同的视角
  S.cameraWide = { dist: 23, pitch: 0.13, fov: 1.04 };                                         // 可切换的广角(能看到双子塔)
  S.npcRect = { x0: -17, x1: 17, z0: -10, z1: 20 }; S.heightAt = () => 0; S.name = '武吉免登 · Pavilion 广场'; S.indoor = false;
  S.env = h => { const e = G.World.envAt(h); e.fogNear = 100; e.fogFar = 260; return e; };
  return S;
}
G.Scenes.makeBukit = makeBukit;
})(window);
