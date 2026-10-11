/* Masjid & Mawaid at 3812 Barney Rd — model builder.
   Rooms are taken from the vector architecture plan (sheet 05, rev 09), in PDF points, and converted to feet
   (Masjid 53'0" = 169.2 pt → 0.31315 ft/pt). Frame: +X = right on the sheet, +Z = down the sheet.
   The site (lot, road, woods) is traced from aerial imagery and converted into this frame. */
function buildMasjid(THREE, opt) {
  opt = Object.assign({ cut: 0, furniture: true, trees: true }, opt || {});
  const TI = 0.6, TE = 1.0, GF = 15, UP = 13, TWO = GF + 1 + UP;
  const SC = 0.31315, PX = px => 112 + (px - 329.5) * SC, PZ = py => (py - 80) * SC, PP = (px, py) => [PX(px), PZ(py)];
  const root = new THREE.Group(); root.name = 'Masjid_Mawaid_Barney_Rd';
  const G = {};
  ['floors', 'walls', 'glass', 'upper', 'roofs', 'dome', 'furniture', 'site', 'landscape', 'trees'].forEach(k => { G[k] = new THREE.Group(); G[k].name = k; root.add(G[k]); });

  const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.88, metalness: 0 }, o || {}));
  const M = {
    wall: std(0xeee8dc), oldWall: std(0xcdb79a), plinth: std(0xc9bfae), roof: std(0xd8d1c4), shingle: std(0x4a4f55, { side: THREE.DoubleSide }),
    trim: std(0xf6f1e6, { roughness: 0.7 }), stone: std(0xe6dccb),
    glass: std(0x8fb2c6, { roughness: 0.1, metalness: 0.15, transparent: true, opacity: 0.5 }),
    archGlass: std(0x6f8796, { roughness: 0.15, metalness: 0.2 }),
    dome: std(0xf3efe6, { roughness: 0.5 }), gold: std(0xd4a640, { roughness: 0.28, metalness: 0.75 }),
    brass: std(0xc59a45, { roughness: 0.4, metalness: 0.5 }), steel: std(0x9aa3a8, { roughness: 0.4, metalness: 0.4 }),
    white: std(0xf7f7f5, { roughness: 0.3 }), wood: std(0x8a5d3b), leaf: std(0x46703a, { flatShading: true }), leaf2: std(0x2f5528, { flatShading: true }),
    hedge: std(0x3d6b35, { flatShading: true }), trunk: std(0x6b4f35), water: std(0x5f9fc0, { roughness: 0.1 }),
    grass: std(0x5b7a42), lawn: std(0x6b8c4c), soil: std(0x5a4433), pave: std(0xd2c8b4), paveDark: std(0xb9ab92),
    asphalt: std(0x3b3e42, { roughness: 0.95 }), road: std(0x404347, { roughness: 0.95 }), stripe: std(0xf2f2ee), yellow: std(0xe0b83a),
    curb: std(0xd9d3c6), gravel: std(0xa39d92), dark: std(0x7d8186), rail: std(0x6f6250, { roughness: 0.5, metalness: 0.4 }),
    iron: std(0x2b2d30, { roughness: 0.5, metalness: 0.6 }), sand: std(0xd8c49a), saff: std(0xd8c27a, { roughness: 0.7 }),
    lamp: std(0xfff3d6, { emissive: 0x7a6a40, roughness: 0.4 }),
    doorGlass: std(0x7fa6bb, { roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.55 }), doorFrame: std(0x3a3d40, { roughness: 0.35, metalness: 0.6 })
  };
  const FLOWER = [0xc8324a, 0xe57aa6, 0xf2c230, 0xf4f1ea, 0x8a5cc2, 0xe8692c].map(c => std(c, { roughness: 0.6, flatShading: true }));
  const ZONES = {
    prayer: { c: 0x2e6b5b, n: 'Prayer' }, sahan: { c: 0xe4dfd3, n: 'Sahan & upper floor' }, dining: { c: 0xb68a60, n: 'Dining (Mawaid)' },
    service: { c: 0xa8b0b4, n: 'Kitchen & service' }, admin: { c: 0xcbb790, n: 'Offices' }, edu: { c: 0x9bb5cb, n: 'Madressah' },
    wet: { c: 0x86c0c3, n: 'Ablution & restrooms' }, circ: { c: 0xd8d0bf, n: 'Entry & circulation' }, garden: { c: 0x6f9a52, n: 'Garden' }
  };
  const labels = [], pickables = [];
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  function mesh(geo, mat, parent, x, y, z, name) {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    if (name) m.name = name; parent.add(m); return m;
  }
  function box(w, h, d, mat, parent, x, y, z, name) { return mesh(new THREE.BoxGeometry(w, h, d), mat, parent, x, y, z, name); }
  function seg2(p, q, w, h, y, mat, parent, name) {
    const dx = q[0] - p[0], dz = q[1] - p[1], L = Math.hypot(dx, dz);
    const m = box(L, h, w, mat, parent, (p[0] + q[0]) / 2, y + h / 2, (p[1] + q[1]) / 2, name);
    m.rotation.y = -Math.atan2(dz, dx); return m;
  }
  function flat(pts, y, mat, parent, name, thick) {
    const s = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], -p[1])));
    const g = thick ? new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false }) : new THREE.ShapeGeometry(s);
    g.rotateX(-Math.PI / 2);
    const m = mesh(g, mat, parent, 0, y, 0, name); m.castShadow = !!thick; return m;
  }
  function mergeGeos(list) {
    const pos = [], nor = [];
    list.forEach(g => { const n = g.index ? g.toNonIndexed() : g; pos.push(...n.attributes.position.array); nor.push(...n.attributes.normal.array); });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    return out;
  }
  const inPoly = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (((yi > p[1]) !== (yj > p[1])) && (p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi)) c = !c; } return c; };

  // ── walls with openings at any height ──
  function wallRun(ax, fixed, a0, a1, base, h, t, ops, name, mat) {
    const hh = opt.cut ? Math.min(h, opt.cut) : h; mat = mat || M.wall;
    ops = ops.map(o => ({ s: Math.max(o.s, a0), e: Math.min(o.e, a1), v: o.v })).filter(o => o.e - o.s > 0.05);
    const bps = [...new Set([a0, a1, ...ops.flatMap(o => [o.s, o.e])])].sort((a, b) => a - b);
    const put = (s, e, y0, y1, m, tt) => {
      y1 = Math.min(y1, hh); if (e - s < 0.05 || y1 - y0 < 0.05) return;
      const L = e - s, mid = (s + e) / 2, H = y1 - y0, ym = base + y0 + H / 2, par = m === M.glass ? G.glass : G.walls;
      const g = ax === 'x' ? new THREE.BoxGeometry(L, H, tt) : new THREE.BoxGeometry(tt, H, L);
      const mm = ax === 'x' ? mesh(g, m, par, mid, ym, fixed) : mesh(g, m, par, fixed, ym, mid);
      mm.name = name; if (m === M.glass) mm.castShadow = false;
    };
    // frames for glass doors: jambs, centre mullions, transom
    ops.filter(o => o.v.some(v => v[2] === 2)).forEach(o => {
      const W = o.e - o.s, nLeaf = Math.max(2, Math.round(W / 3.2)), fr = (s, e, y0, y1) => { const L = e - s, H = Math.min(y1, hh) - y0; if (H <= 0) return;
        const g = ax === 'x' ? new THREE.BoxGeometry(L, H, t * 0.5) : new THREE.BoxGeometry(t * 0.5, H, L);
        ax === 'x' ? mesh(g, M.doorFrame, G.walls, (s + e) / 2, base + y0 + H / 2, fixed, 'door_frame') : mesh(g, M.doorFrame, G.walls, fixed, base + y0 + H / 2, (s + e) / 2, 'door_frame'); };
      for (let i = 0; i <= nLeaf; i++) { const x = o.s + W * i / nLeaf; fr(Math.max(o.s, x - 0.15), Math.min(o.e, x + 0.15), 0, 9.5); }
      fr(o.s, o.e, 7.6, 7.85); fr(o.s, o.e, 9.25, 9.5); fr(o.s, o.e, 0, 0.3);
      for (let i = 0; i < nLeaf; i++) { const x = o.s + W * (i + 0.5) / nLeaf; fr(x - 0.04, x + 0.04, 3.3, 4.3); }
      if (!opt.cut) addArchDoor(ax, fixed, t, base, o.s, o.e, 9.5);
    });
    for (let i = 0; i < bps.length - 1; i++) {
      const p = bps[i], q = bps[i + 1];
      const holes = ops.filter(o => o.s <= p + 1e-6 && o.e >= q - 1e-6).flatMap(o => o.v).filter(v => opt.cut || v[2] !== 1).sort((a, b) => a[0] - b[0]);
      let y = 0;
      for (const [b, tp, gl] of holes) { if (b > y) put(p, q, y, b, mat, t); if (gl) put(p, q, b, tp, gl === 2 ? M.doorGlass : M.glass, t * 0.3); y = Math.max(y, tp); }
      put(p, q, y, hh, mat, t);
    }
    if (!opt.cut) {
      const front = ax === 'x' && fixed > PZ(430) && fixed < PZ(470) && a0 > PX(320);
      ops.forEach(o => o.v.forEach(v => { if (v[2] === 1) addWindows(ax, fixed, t, base, h, o.s, o.e, v[0], v[1], front); }));
    }
  }
  // ── pointed-arch windows (after the reference photos) ──
  const WIN = { frame: [], glass: [], bar: [], lat: [], dglass: [], dbar: [] };
  const M_winGlass = std(0x46596a, { roughness: 0.15, metalness: 0.35 }), M_lattice = std(0xd6c29a, { roughness: 0.7 });
  function pArch(w, h, k) {
    const r = w * (k || 0.8), hw = w / 2, cL = -hw + r, cR = hw - r, th = Math.acos((hw - r) / r), hs = h - r * Math.sin(th);
    const s = new THREE.Shape(); s.moveTo(-hw, 0); s.lineTo(-hw, hs); s.absarc(cL, hs, r, Math.PI, th, true); s.absarc(cR, hs, r, Math.PI - th, 0, true); s.lineTo(hw, 0); s.lineTo(-hw, 0);
    return { s, hs, inside: (x, y, m) => Math.abs(x) < hw - m && y > m && (y < hs || (Math.hypot(x - cL, y - hs) < r - m && Math.hypot(x - cR, y - hs) < r - m)) };
  }
  function placeG(g, ax, fixed, t, side, s, y0, off) {
    const rot = ax === 'x' ? (side > 0 ? 0 : Math.PI) : (side > 0 ? Math.PI / 2 : -Math.PI / 2);
    const pos = ax === 'x' ? new THREE.Vector3(s, y0, fixed + side * t / 2) : new THREE.Vector3(fixed + side * t / 2, y0, s);
    g.applyMatrix4(new THREE.Matrix4().makeTranslation(pos.x, pos.y, pos.z).multiply(new THREE.Matrix4().makeRotationY(rot)).multiply(new THREE.Matrix4().makeTranslation(0, 0, off)));
    return g;
  }
  // domed glass fanlight and surround over a glass door, springing from the door's transom; kept below the porch canopy
  function addArchDoor(ax, fixed, t, base, s0, s1, head) {
    const W = s1 - s0, hw = W / 2, sc = (s0 + s1) / 2, spring = 7.6, rise = Math.min(hw * 1.0, 16 - 0.6 - (base + spring));
    const arcPts = (h, r) => { const p = []; for (let i = 0; i <= 40; i++) { const a = Math.PI * i / 40, c2 = Math.cos(a); p.push([-h * c2, r * Math.sin(a) * (1 + 0.18 * (1 - Math.abs(c2))) / 1.18]); } return p; };
    const outline = (h, r, yb) => { const s = new THREE.Shape(); s.moveTo(-h, yb); arcPts(h, r).forEach(([x, y]) => s.lineTo(x, y)); s.lineTo(h, yb); s.lineTo(-h, yb); return s; };
    const capS = () => { const s = new THREE.Shape(), p = arcPts(hw, rise); s.moveTo(p[0][0], p[0][1]); p.slice(1).forEach(([x, y]) => s.lineTo(x, y)); s.lineTo(p[0][0], p[0][1]); return s; };
    const ex = (shape, d) => new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
    const y0 = base + spring;
    [1, -1].forEach(side => {
      const F = outline(hw + 0.5, rise + 0.45, -spring); F.holes.push(outline(hw, rise, -spring + 0.01));
      WIN.frame.push(placeG(ex(F, 0.26), ax, fixed, t, side, sc, y0, 0));
      WIN.dglass.push(placeG(ex(capS(), 0.05), ax, fixed, t, side, sc, y0, 0.02));
      const hb = new THREE.BoxGeometry(W, 0.25, 0.14); hb.translate(0, 0.12, 0.1); WIN.dbar.push(placeG(hb, ax, fixed, t, side, sc, y0, 0));
      const vb = new THREE.BoxGeometry(0.2, rise, 0.14); vb.translate(0, rise / 2, 0.1); WIN.dbar.push(placeG(vb, ax, fixed, t, side, sc, y0, 0));
      [-1, 1].forEach(k => { const L = Math.hypot(hw * 0.62, rise * 0.78), g = new THREE.BoxGeometry(0.16, L, 0.14); g.translate(0, L / 2, 0); g.applyMatrix4(new THREE.Matrix4().makeRotationZ(-k * Math.atan2(hw * 0.62, rise * 0.78))); g.translate(0, 0, 0.1); WIN.dbar.push(placeG(g, ax, fixed, t, side, sc, y0, 0)); });
    });
  }
  function addWindows(ax, fixed, t, base, h, s0, s1, b, tp, front) {
    const W = s1 - s0, n = Math.max(1, Math.ceil(W / 7)), cw = W / n, w = cw - 0.9;
    if (w < 1.2) return;
    const lim = (h > GF + 2 && b < GF) ? GF - 1.5 : h - 1.2, top = Math.min(Math.max(tp, b + w * 1.45), lim), hgt = top - b;
    for (let i = 0; i < n; i++) {
      const sc = s0 + cw * (i + 0.5), y0 = base + b;
      [1, -1].forEach(side => {
        const A = pArch(w, hgt), F = pArch(w + 0.7, hgt + 0.4);
        const fs = F.s; fs.holes.push(A.s);
        const ex = (shape, d) => new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false, curveSegments: 10 });
        WIN.frame.push(placeG(ex(fs, 0.22), ax, fixed, t, side, sc, y0 - 0.2, 0));
        WIN.glass.push(placeG(ex(pArch(w, hgt).s, 0.04), ax, fixed, t, side, sc, y0, 0.01));
        if (front && side > 0) {
          const L = pArch(w, hgt), sz = 0.2;
          for (let y = 0.5; y < hgt; y += 0.62) for (let x = -w / 2 + 0.45 + ((Math.round(y / 0.62)) % 2) * 0.31; x < w / 2 - 0.3; x += 0.62)
            if (L.inside(x, y, 0.38)) { const hp = new THREE.Path(); hp.moveTo(x, y - sz); hp.lineTo(x + sz, y); hp.lineTo(x, y + sz); hp.lineTo(x - sz, y); hp.lineTo(x, y - sz); L.s.holes.push(hp); }
          WIN.lat.push(placeG(ex(L.s, 0.1), ax, fixed, t, side, sc, y0, 0.05));
          if (top + 2.4 < h) { const dg = new THREE.BoxGeometry(1.3, 1.3, 0.14); dg.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI / 4)); WIN.lat.push(placeG(dg, ax, fixed, t, side, sc, top + 1.4, 0.07)); }
        } else {
          const vb = new THREE.BoxGeometry(0.16, hgt - 0.1, 0.12); vb.translate(0, hgt / 2, 0.08); WIN.bar.push(placeG(vb, ax, fixed, t, side, sc, y0, 0));
          const hb = new THREE.BoxGeometry(w, 0.16, 0.12); hb.translate(0, A.hs, 0.08); WIN.bar.push(placeG(hb, ax, fixed, t, side, sc, y0, 0));
        }
      });
    }
  }
  function vRanges(k, two, h) {
    switch (k) {
      case 'door': return [[0, 7.5]];
      case 'gate': return [[0, 9.5]];
      case 'gdoor': return [[0, 9.5, 2]];
      case 'hatch': return [[3, 7.5]];
      case 'win': return two ? [[3, 7.5, 1], [GF + 4, GF + 8.5, 1]] : [[3, 7.5, 1]];
      case 'tall': return two ? [[2, GF - 2.5, 1], [GF + 3, TWO - 2.5, 1]] : [[2, h - 2, 1]];
      case 'uwin': return [[GF + 4, GF + 8.5, 1]];
      case 'open': return [[0, two ? GF : h]];
      case 'open2': return [[0, h]];
    }
    return [[0, 7.5]];
  }

  // room from plan points: r = [x0, y0, x1, y1] in pt; o = [side, from, to, kind] with absolute pt along that side
  function room(R) {
    const [a, b, c, d] = R.r, x0 = PX(a), z0 = PZ(b), x1 = PX(c), z1 = PZ(d);
    const t = R.t || (R.out ? TE : TI), fl = R.fl || 0, h = R.two ? TWO : (R.h || 11), nw = R.nw || [], wmat = R.old ? M.oldWall : M.wall;
    const ops = { N: [], S: [], E: [], W: [] };
    (R.o || []).forEach(([sd, f, to, k]) => { const s = (sd === 'N' || sd === 'S') ? PX(f) : PZ(f), e = (sd === 'N' || sd === 'S') ? PX(to) : PZ(to); ops[sd].push({ s, e, v: vRanges(k || 'door', R.two, h) }); });
    const nm = (R.id || R.name || 'wall').replace(/[^A-Za-z0-9]+/g, '_');
    if (!R.out) {
      if (!nw.includes('N')) wallRun('x', z0 + t / 2, x0, x1, fl, h, t, ops.N, nm + '_N', wmat);
      if (!nw.includes('S')) wallRun('x', z1 - t / 2, x0, x1, fl, h, t, ops.S, nm + '_S', wmat);
      const za = z0 + (nw.includes('N') ? 0 : t), zb = z1 - (nw.includes('S') ? 0 : t);
      if (!nw.includes('W')) wallRun('z', x0 + t / 2, za, zb, fl, h, t, ops.W, nm + '_W', wmat);
      if (!nw.includes('E')) wallRun('z', x1 - t / 2, za, zb, fl, h, t, ops.E, nm + '_E', wmat);
    } else {
      if (!nw.includes('N')) wallRun('x', z0 - t / 2, x0 - t, x1 + t, fl, h, t, ops.N, nm + '_N', wmat);
      if (!nw.includes('S')) wallRun('x', z1 + t / 2, x0 - t, x1 + t, fl, h, t, ops.S, nm + '_S', wmat);
      if (!nw.includes('W')) wallRun('z', x0 - t / 2, z0, z1, fl, h, t, ops.W, nm + '_W', wmat);
      if (!nw.includes('E')) wallRun('z', x1 + t / 2, z0, z1, fl, h, t, ops.E, nm + '_E', wmat);
    }
    if (R.floor !== false) {
      const top = fl + 0.03 * (R.layer == null ? 1 : R.layer) + 0.02, ex = R.out ? t : 0;
      const zmat = std(ZONES[R.zone || 'circ'].c, { roughness: R.zone === 'prayer' ? 0.95 : 0.6 });
      const f = mesh(new THREE.BoxGeometry(x1 - x0 + 2 * ex, top, z1 - z0 + 2 * ex), [M.plinth, M.plinth, zmat, M.plinth, M.plinth, M.plinth], G.floors, (x0 + x1) / 2, top / 2, (z0 + z1) / 2, nm + '_floor');
      if (R.name) { f.userData = { name: R.name, dim: R.dim || '', zone: ZONES[R.zone || 'circ'].n, level: R.lvl || '', note: R.note || '' }; pickables.push(f); }
    }
    if (R.two && !opt.cut) upperSlab(R, x0, z0, x1, z1, t, fl);
    if (R.roof !== false) box(x1 - x0 + 0.6, 1, z1 - z0 + 0.6, M.roof, G.roofs, (x0 + x1) / 2, fl + h + 0.5, (z0 + z1) / 2, nm + '_roof');
    if (R.parapet && !opt.cut) parapet(x0, z0, x1, z1, fl + h + 1, R.parapet);
    if (R.name && R.label !== false) labels.push({ name: R.name, dim: R.dim || '', big: !!R.big, x: (x0 + x1) / 2 + (R.lx || 0), y: fl + (R.big ? 12 : 5), z: (z0 + z1) / 2 + (R.lz || 0) });
    if (R.wc && opt.furniture) toilet((x0 + x1) / 2, fl, z0 + 1.8);
    return { x0, z0, x1, z1 };
  }
  function toilet(x, fl, z) { box(1.4, 1.4, 2, M.white, G.furniture, x, fl + 0.7, z, 'toilet'); }

  function upperSlab(R, x0, z0, x1, z1, t, fl) {
    const a = x0 + t, b = z0 + t, c = x1 - t, d = z1 - t, y = fl + GF + 0.5;
    const zm = std(ZONES[R.zone === 'prayer' ? 'prayer' : 'sahan'].c, { roughness: 0.8 });
    const slab = (sx0, sz0, sx1, sz1) => { if (sx1 - sx0 > 0.1 && sz1 - sz0 > 0.1) {
      const m = mesh(new THREE.BoxGeometry(sx1 - sx0, 1, sz1 - sz0), [M.plinth, M.plinth, zm, M.trim, M.plinth, M.plinth], G.upper, (sx0 + sx1) / 2, y, (sz0 + sz1) / 2, 'upper_slab');
      if (R.upperName) { m.userData = { name: R.upperName, dim: R.upperDim || '', zone: 'Upper floor', level: 'Upper floor, ' + (GF + 1) + ' ft above ground floor', note: 'Layout of this floor was not provided; shown as open floor.' }; pickables.push(m); }
    } };
    if (!R.void) slab(a, b, c, d);
    else if (R.void !== 'all') {
      const [v0, w0, v1, w1] = [PX(R.void[0]), PZ(R.void[1]), PX(R.void[2]), PZ(R.void[3])];
      slab(a, b, c, w0); slab(a, w1, c, d); slab(a, w0, v0, w1); slab(v1, w0, c, w1);
      [[[v0, w0], [v1, w0]], [[v1, w0], [v1, w1]], [[v1, w1], [v0, w1]], [[v0, w1], [v0, w0]]].forEach(([p, q]) => {
        seg2(p, q, 0.15, 3.3, y + 0.5, M.glass, G.upper, 'void_railing_glass');
        seg2(p, q, 0.35, 0.25, y + 0.5 + 3.3, M.rail, G.upper, 'void_railing_top');
      });
      if (R.upperName) labels.push({ name: R.upperName, dim: '', upper: true, x: (v0 + v1) / 2, y: fl + GF + 5, z: w0 - 4 });
    }
  }

  function parapet(x0, z0, x1, z1, y, sides) {
    sides = sides === true ? 'NSEW' : sides;
    const e = [], o = 0.4;
    if (sides.includes('N')) e.push([[x0 - o, z0 - o], [x1 + o, z0 - o], [0, -1]]);
    if (sides.includes('S')) e.push([[x0 - o, z1 + o], [x1 + o, z1 + o], [0, 1]]);
    if (sides.includes('W')) e.push([[x0 - o, z0 - o], [x0 - o, z1 + o], [-1, 0]]);
    if (sides.includes('E')) e.push([[x1 + o, z0 - o], [x1 + o, z1 + o], [1, 0]]);
    e.forEach(([p, q, n]) => {
      seg2(p, q, 1.6, 0.8, y - 1.6, M.trim, G.roofs, 'cornice');
      seg2(p, q, 0.9, 3.2, y - 0.8, M.wall, G.roofs, 'parapet');
      seg2(p, q, 1.5, 0.45, y + 2.4, M.trim, G.roofs, 'coping');
      const L = Math.hypot(q[0] - p[0], q[1] - p[1]), N = Math.floor(L / 5.5);
      for (let i = 1; i < N; i++) {
        const f = i / N, x = p[0] + (q[0] - p[0]) * f + n[0] * 0.95, z = p[1] + (q[1] - p[1]) * f + n[1] * 0.95;
        const orn = box(n[0] ? 0.2 : 0.75, 0.75, n[0] ? 0.75 : 0.2, M.stone, G.roofs, x, y + 0.9, z, 'parapet_ornament');
        orn.rotation.set(n[0] ? Math.PI / 4 : 0, 0, n[1] ? Math.PI / 4 : 0); orn.castShadow = false;
      }
    });
  }
  function arch(w, h, depth) {
    const s = new THREE.Shape(), r = w / 2;
    s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, h - r); s.absarc(0, h - r, r, 0, Math.PI, false); s.lineTo(-r, 0);
    return new THREE.ExtrudeGeometry(s, { depth: depth || 0.2, bevelEnabled: false, curveSegments: 16 });
  }
  function archOnFace(parent, cx, cy, cz, faceAngle, w, h) {
    [[arch(w + 0.9, h + 0.45, 0.25), M.trim, 0, -0.2], [arch(w, h, 0.3), M.archGlass, 0.08, 0]].forEach(([g, m, off, dy]) => {
      const mm = new THREE.Mesh(g, m); mm.receiveShadow = true;
      mm.position.set(cx + Math.sin(faceAngle) * off, cy + dy, cz + Math.cos(faceAngle) * off); mm.rotation.y = faceAngle; mm.name = 'arched_window'; parent.add(mm);
    });
  }
  function hipRoof(x0, z0, x1, z1, y, H, o, mat, parent) {
    const a = [x0 - o, y, z0 - o], b = [x1 + o, y, z0 - o], c = [x1 + o, y, z1 + o], d = [x0 - o, y, z1 + o];
    const W = (x1 - x0) + 2 * o, cx = (x0 + x1) / 2;
    const r1 = [cx, y + H, z0 - o + W / 2], r2 = [cx, y + H, z1 + o - W / 2];
    const tri = [a, r1, b, b, r1, r2, b, r2, c, c, r2, d, d, r2, r1, d, r1, a];
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(tri.flat(), 3)); g.computeVertexNormals();
    return mesh(g, mat, parent, 0, 0, 0, 'existing_hip_roof');
  }
  // flower bed: scatter flowers of several colours (merged per colour) where test(x, z) is true
  function flowers(test, bounds, y, density, parent, palette, nm) {
    palette = palette || [0, 1, 2, 3, 4, 5];
    const per = palette.map(() => []), stems = [];
    const [bx0, bz0, bx1, bz1] = bounds, step = 1 / Math.sqrt(density);
    for (let z = bz0; z <= bz1; z += step) for (let x = bx0; x <= bx1; x += step) {
      const px = x + (rnd() - 0.5) * step, pz = z + (rnd() - 0.5) * step; if (!test(px, pz)) continue;
      const k = Math.floor(rnd() * per.length), s = 0.35 + rnd() * 0.25;
      const fg = new THREE.IcosahedronGeometry(s, 0); fg.translate(px, y + 0.9 + rnd() * 0.4, pz); per[k].push(fg);
      const lg = new THREE.IcosahedronGeometry(0.55, 0); lg.scale(1, 0.6, 1); lg.translate(px, y + 0.35, pz); stems.push(lg);
    }
    per.forEach((list, i) => { if (list.length) mesh(mergeGeos(list), FLOWER[palette[i]], parent, 0, 0, 0, nm + '_flowers').castShadow = false; });
    if (stems.length) mesh(mergeGeos(stems), M.hedge, parent, 0, 0, 0, nm + '_foliage').castShadow = false;
  }
  function lampPost(x, z, parent) {
    mesh(new THREE.CylinderGeometry(0.18, 0.25, 12, 10), M.iron, parent, x, 6, z, 'lamp_post');
    mesh(new THREE.CylinderGeometry(0.55, 0.35, 1.3, 8), M.lamp, parent, x, 12.6, z, 'lamp');
    mesh(new THREE.ConeGeometry(0.75, 0.7, 8), M.iron, parent, x, 13.6, z, 'lamp_cap');
  }
  function hedgeLine(p, q, parent, nm) {
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(1, Math.round(L / 2.2)), hg = [];
    for (let i = 0; i <= n; i++) { const f = i / n, g = new THREE.IcosahedronGeometry(1.15, 0); g.scale(1, 0.8, 1); g.translate(p[0] + (q[0] - p[0]) * f, 1, p[1] + (q[1] - p[1]) * f); hg.push(g); }
    mesh(mergeGeos(hg), M.hedge, parent, 0, 0, 0, nm);
  }

  // ═════════ BUILDING ═════════
  // MASJID
  room({ name: 'Masjid', dim: "53'0\" × 53'0\"", label: false, zone: 'prayer', r: [329.5, 79, 503.5, 252], fl: 3, two: true, t: TE, lvl: "+3'0\"", lz: 6, parapet: true,
    void: [373.75, 98.75, 458.75, 163.75], upperName: 'Upper gallery', upperDim: "Open to below: 26'2\" × 20'0\"",
    note: 'Prayer hall. The 26\'2" × 20\'0" centre is double height, open to the upper floor. Emergency exits on both sides.',
    o: [['N', 357.5, 378, 'tall'], ['N', 409.7, 426.3, 'open'], ['N', 453.75, 473.75, 'tall'],
      ['W', 95, 116, 'tall'], ['W', 139, 160, 'tall'], ['W', 182.5, 202.5, 'tall'], ['W', 210, 219], ['W', 210, 219, 'uwin'], ['W', 228, 248, 'win'],
      ['E', 95, 116, 'tall'], ['E', 139, 160, 'tall'], ['E', 182.5, 202.5, 'tall'], ['E', 211, 220], ['E', 232, 247, 'win'],
      ['S', 360, 377.5, 'gate'], ['S', 407.5, 425, 'gate'], ['S', 455, 472.5, 'gate']] });
  { // QIBLA — semicircular niche projecting from the qibla wall
    const mx = PX(418), mz = PZ(79), ri = 2.6, ro = 3.6, fl = 3, H = opt.cut ? opt.cut : 18;
    const s = new THREE.Shape(); s.absarc(0, 0, ro, 0, Math.PI, false); s.lineTo(-ri, 0); s.absarc(0, 0, ri, Math.PI, 0, true); s.lineTo(ro, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: H, bevelEnabled: false, curveSegments: 32 }); g.rotateX(-Math.PI / 2);
    mesh(g, M.wall, G.walls, mx, fl, mz, 'qibla_wall');
    const fs = new THREE.Shape(); fs.absarc(0, 0, ri, 0, Math.PI, false); fs.lineTo(ri, 0);
    const fg = new THREE.ExtrudeGeometry(fs, { depth: 0.08, bevelEnabled: false, curveSegments: 32 }); fg.rotateX(-Math.PI / 2);
    const fm = mesh(fg, std(ZONES.prayer.c, { roughness: 0.95 }), G.floors, mx, fl, mz + 0.5, 'qibla_floor');
    fm.userData = { name: 'Qibla', dim: 'Semicircular niche on the qibla wall', zone: 'Prayer', level: "+3'0\"", note: 'Marks the qibla, the direction of prayer.' }; pickables.push(fm);
    // arched outline inside the niche and a gold band
    const band = new THREE.Mesh(new THREE.TorusGeometry(ri - 0.05, 0.12, 6, 32, Math.PI), M.gold); band.rotation.x = Math.PI / 2; band.rotation.z = Math.PI; band.position.set(mx, fl + 9, mz); G.furniture.add(band);
    if (!opt.cut) {
      const cap = new THREE.ExtrudeGeometry((() => { const c2 = new THREE.Shape(); c2.absarc(0, 0, ro + 0.4, 0, Math.PI, false); c2.lineTo(ro + 0.4, 0); return c2; })(), { depth: 0.8, bevelEnabled: false, curveSegments: 32 });
      cap.rotateX(-Math.PI / 2); mesh(cap, M.trim, G.roofs, mx, fl + H, mz, 'qibla_cornice');
      mesh(new THREE.SphereGeometry(ro, 32, 12, Math.PI, Math.PI, 0, Math.PI / 2), M.dome, G.roofs, mx, fl + H + 0.8, mz, 'qibla_semidome');
      mesh(new THREE.LatheGeometry([[0, 0], [0.25, 0], [0.3, 0.3], [0.12, 0.55], [0.05, 1.4], [0, 1.7]].map(q => new THREE.Vector2(q[0], q[1])), 12), M.gold, G.roofs, mx, fl + H + 0.8 + ro - 0.1, mz - 0.6, 'qibla_finial');
    }
    labels.push({ name: 'Qibla', dim: '', x: mx, y: fl + 5, z: mz - 1.5 });
  }
  room({ name: 'Sound Control Room', dim: "7'6\" × 9'0\"", zone: 'admin', r: [503.5, 223.75, 528, 252], nw: ['W'], fl: 3, two: true, lvl: "+3'0\"", parapet: 'NE',
    note: 'Has a window looking into the Masjid.', o: [['S', 519, 528], ['N', 510, 526, 'win']] });

  // SAHAN, LOBBY, ENTRY
  const gatesX = [['N', 360, 377.5, 'gate'], ['N', 407.5, 425, 'gate'], ['N', 455, 472.5, 'gate']];
  room({ name: 'Sahan 1', dim: "53'0\" × 38'0\"", label: false, zone: 'sahan', r: [329.5, 252, 503.5, 376.5], fl: 2.5, two: true, t: TE, lvl: "+2'6\"", lz: 6, parapet: 'W',
    void: [391.75, 296.75, 440.75, 332], upperName: 'Upper floor', note: 'Courtyard hall with a double-height opening in the centre.',
    o: gatesX.concat(gatesX.map(g => ['S', g[1], g[2], 'gate']),
      [['W', 256, 275, 'gate'], ['W', 305, 324, 'gate'], ['W', 354, 372.5, 'gate'], ['W', 256, 275, 'uwin'], ['W', 305, 324, 'uwin'], ['W', 354, 372.5, 'uwin'], ['E', 254, 266], ['E', 330, 340]]) });
  room({ name: 'Lobby', zone: 'circ', r: [329.5, 376.5, 501, 397], fl: 2.5, two: true, label: false, parapet: 'W',
    o: gatesX.concat([['S', 336, 352.5], ['S', 380, 450, 'open2'], ['S', 483.75, 498.75], ['E', 381, 393], ['W', 380, 393, 'uwin']]) });
  room({ name: 'Men Shoe & Coat', dim: "15'6\" × 14'3\"", zone: 'circ', r: [329.5, 397, 380, 446], fl: 2.5, two: true, lvl: "+2'6\"", parapet: 'SW', o: [['N', 336, 352.5], ['E', 427, 435], ['S', 343.75, 365, 'win']] });
  room({ name: 'Main Entrance', dim: "21'0\" × 11'7\" (double height)", zone: 'circ', r: [380, 397, 450, 435], fl: 2.5, two: true, void: 'all', nw: ['N'], lvl: "+2'6\"", parapet: 'S',
    o: [['S', 397.5, 435, 'gdoor'], ['S', 393, 437, 'uwin'], ['W', 427, 435], ['E', 427, 435]] });
  room({ name: 'Women Shoe & Coat', dim: "15'6\" × 14'3\"", zone: 'circ', r: [450, 397, 501, 446], fl: 2.5, two: true, lvl: "+2'6\"", parapet: 'S', o: [['N', 483.75, 498.75], ['W', 427, 435], ['S', 468.75, 487.5, 'win']] });
  room({ name: 'Threshold', dim: "21'0\" × 11'1\"", zone: 'circ', r: [375, 435, 456, 481], fl: 2, nw: ['N', 'S', 'E', 'W'], roof: false, lvl: "+2'0\"", note: 'Covered entrance porch with steps down to the entry plaza.' });

  // SERVICE WING
  room({ name: 'Setting Hall', dim: "10'0\" × 22'9\"", zone: 'admin', r: [504, 252, 536.25, 326.25], fl: 2.5, two: true, o: [['W', 254, 266], ['E', 313.75, 325]] });
  room({ name: 'Dress Up', dim: "4'6\" × 7'4\"", zone: 'wet', r: [536.25, 252, 552.5, 278], fl: 2.5, two: true, parapet: 'N', o: [['S', 541, 548.75]] });
  room({ name: 'VIP Restroom', dim: "9'0\" × 7'4\"", zone: 'wet', wc: true, r: [552.5, 252, 586, 278], fl: 2.5, two: true, parapet: 'NE', o: [['S', 552.5, 562.5], ['N', 565, 578, 'uwin']] });
  room({ name: 'VIP Master Room', dim: "14'0\" × 15'0\"", zone: 'admin', r: [536.25, 278, 586, 327.5], fl: 2.5, two: true, parapet: 'E', o: [['N', 541, 548.75], ['N', 552.5, 562.5], ['W', 313.75, 325], ['E', 282.5, 303.75, 'win']] });
  room({ name: 'Men Ablution', dim: "10'0\" × 5'9\"", zone: 'wet', r: [504, 327.5, 536.25, 348.75], fl: 2.5, two: true, o: [['W', 330, 340], ['S', 506, 516], ['S', 522, 532]] });
  room({ id: 'MRR1', name: 'Restroom', dim: "5'0\" × 8'0\"", zone: 'wet', wc: true, label: false, r: [504, 348.75, 520, 378], fl: 2.5, two: true, o: [['N', 506, 516]] });
  room({ id: 'MRR2', name: 'Restroom', dim: "4'6\" × 8'0\"", zone: 'wet', wc: true, label: false, r: [520, 348.75, 536.25, 378], fl: 2.5, two: true, o: [['N', 522, 532]] });
  room({ name: 'Women Ablution', dim: "14'0\" × 6'5\"", zone: 'wet', r: [536.25, 327.5, 586, 348.75], fl: 2.5, two: true, parapet: 'E', o: [['S', 538, 550, 'open'], ['S', 553, 565], ['S', 570, 582], ['E', 331, 345, 'win']] });
  room({ name: 'Women Entry', zone: 'circ', label: false, r: [536.25, 348.75, 551.25, 378], nw: ['N'], fl: 2.5, two: true, o: [['S', 538, 550]] });
  room({ id: 'WRR1', name: 'Restroom', dim: "4'6\" × 8'0\"", zone: 'wet', wc: true, label: false, r: [551.25, 348.75, 568, 378], fl: 2.5, two: true, o: [['N', 553, 565]] });
  room({ id: 'WRR2', name: 'Restroom', dim: "4'6\" × 8'0\"", zone: 'wet', wc: true, label: false, r: [568, 348.75, 586, 378], fl: 2.5, two: true, parapet: 'E', o: [['N', 570, 582]] });
  room({ name: 'Stairs & Lift', dim: "Lift 5'0\" × 10'0\"", zone: 'circ', r: [501, 378, 550, 462.5], fl: 2.5, two: true, lvl: "+2'6\"", lz: 9, parapet: 'SE',
    note: 'Stair (6" riser, 12" tread) and lift to the upper floor. Women enter from the north side.', o: [['W', 381, 393], ['N', 538, 549], ['S', 518.75, 537.5, 'win'], ['E', 420, 440, 'win']] });

  // DINE AREA
  room({ name: 'Dine Area · Thaal 84', dim: "70'10\" × 69'10\"", label: false, zone: 'dining', r: [100.5, 220, 329.5, 446], fl: 3, h: 18, t: TE, lvl: "+3'0\"", parapet: 'N',
    note: 'Men & women dining hall seating 84 thaals, with emergency exits on three sides.',
    o: [['N', 130, 150, 'win'], ['N', 167.5, 187.5, 'win'], ['N', 237, 257, 'win'], ['N', 275, 295, 'win'],
      ['W', 237.5, 257.5, 'win'], ['W', 281, 301, 'win'], ['W', 310, 319.5], ['W', 321.75, 446, 'open'],
      ['E', 256, 275, 'gate'], ['E', 305, 324, 'gate'], ['E', 354, 372.5, 'gate'],
      ['S', 110, 190, 'hatch'], ['S', 194, 202.5], ['S', 237.5, 256.25, 'win'], ['S', 275, 294.5, 'win'], ['S', 318.75, 327.5]] });
  room({ id: 'DineExt', name: 'Dine extension', label: false, zone: 'dining', r: [21, 321.75, 100.5, 446], fl: 3, h: 18, t: TE, nw: ['E'], parapet: 'NW',
    o: [['N', 52.5, 72.5, 'win'], ['W', 336, 356, 'win'], ['W', 373.75, 395, 'win'], ['W', 426, 436], ['S', 24, 44]] });
  { const a = PP(23, 425), b = PP(328, 444); box(b[0] - a[0], 0.06, b[1] - a[1], std(0xa07650), G.floors, (a[0] + b[0]) / 2, 3.08, (a[1] + b[1]) / 2, 'service_strip'); }

  // MAWAID — section between the dine area and the Madressah
  const B = { fl: 1, h: 12, roof: false };
  const R2 = o => room(Object.assign({}, B, o));
  R2({ name: 'Garden', zone: 'garden', r: [20, 446, 71, 499.5], nw: ['N', 'W', 'E', 'S'], note: 'Landscaped courtyard with a fountain.' });
  R2({ name: 'Women Ablution (Mawaid)', dim: "10'9\" × 10'4\"", zone: 'wet', r: [71, 446, 105, 482], nw: ['N'], o: [['E', 465, 475], ['W', 470, 478]] });
  R2({ name: 'Service Area', zone: 'service', r: [105, 446, 192.5, 482], nw: ['N', 'S'], note: 'Three service platforms open onto the dine area; thaal racks and a service window below.', o: [['W', 465, 475], ['E', 455, 465]] });
  R2({ name: 'Mawaid Entry', zone: 'circ', r: [192.5, 446, 219, 482], nw: ['N'], o: [['W', 455, 465], ['S', 197, 212, 'win'], ['E', 455, 467]] });
  { const a = PP(71, 446), b = PP(219, 482); box(b[0] - a[0] + 1, 1, b[1] - a[1], M.roof, G.roofs, (a[0] + b[0]) / 2, 1 + 12 + 0.5, (a[1] + b[1]) / 2, 'mawaid_roof'); }
  parapet(PX(71), PZ(446), PX(219), PZ(482), 1 + 12 + 1, 'E');

  // EXISTING BUILDING (future Madressah) — 62' × 89' on the drawing, matching the aerial footprint
  const EXr = [19.5, 482, 219, 767];
  room({ id: 'MadressahEnv', name: 'Madressah', label: false, out: true, layer: 0, zone: 'edu', r: EXr, fl: 1, h: 12, roof: false, nw: ['N'],
    o: [['W', 504, 524, 'win'], ['W', 545, 565, 'win'], ['W', 597, 617, 'win'], ['W', 655, 676, 'win'], ['W', 694, 717, 'win'], ['W', 736, 759, 'win'],
      ['S', 32.5, 45, 'win'], ['S', 65.5, 78, 'win'], ['S', 97, 109.5, 'win'], ['S', 129, 141, 'win'], ['S', 161, 173, 'win'], ['S', 193, 205.5, 'win'],
      ['E', 540, 552], ['E', 568, 580], ['E', 674, 686], ['E', 722, 732], ['E', 742, 754.5, 'win'], ['E', 600, 615, 'win'], ['E', 640, 655, 'win']] });
  R2({ name: 'Dum Area / Zabiyat Room', dim: "10'2\" × 10'2\"", zone: 'service', r: [72, 482, 105, 516], o: [['E', 500, 508]] });
  R2({ name: 'Kitchen Grocery Store', dim: "10'2\" × 10'6\"", zone: 'service', r: [72, 530, 107, 566], o: [['N', 85, 95]] });
  R2({ name: 'Pot Wash Area', dim: "11'6\" × 10'6\"", zone: 'service', r: [107, 530, 145, 566], o: [['N', 110, 140, 'open']] });
  R2({ name: 'Thaali Receiving', dim: "7'8\" × 9'8\"", zone: 'service', r: [145, 482, 172, 513], o: [['W', 490, 500]] });
  R2({ name: 'Cold Storage', dim: "7'8\" × 9'8\"", zone: 'service', r: [145, 530, 172, 566], o: [['N', 150, 160]] });
  R2({ name: 'Kitchen', dim: "13'1\" × 25'8\"", zone: 'service', r: [172, 482, 213, 566], note: 'Separate veg and non-veg prep counters, cutting/chopping and service tables.', o: [['W', 485, 497], ['E', 540, 552]] });
  R2({ name: 'Aamil Office', dim: "15'6\" × 20'0\"", zone: 'admin', r: [20, 499.5, 72, 566], nw: ['W'], o: [['N', 21, 31], ['E', 552, 562]] });
  R2({ name: 'Pantry', zone: 'service', r: [20, 578, 46, 586], nw: ['W'], label: false });
  R2({ name: 'Meeting Room', dim: "15'6\" × 12'4\"", zone: 'admin', r: [20, 587, 74, 628], nw: ['W'], o: [['E', 595, 605]] });
  R2({ id: 'U1', name: 'Umoor Office', dim: "pair, 15'6\" × 9'0\"", zone: 'admin', r: [20, 628, 47.5, 657.5], nw: ['W'], label: false, o: [['E', 638, 646]] });
  R2({ id: 'U2', name: 'Umoor Office', dim: "pair, 15'6\" × 9'0\"", zone: 'admin', r: [47.5, 628, 74, 657.5], label: false, o: [['E', 633, 643]] });
  R2({ id: 'U3', name: 'Umoor Office', dim: "pair, 15'6\" × 9'0\"", zone: 'admin', r: [20, 657.5, 47.5, 687.5], nw: ['W'], label: false, o: [['E', 668, 676]] });
  R2({ id: 'U4', name: 'Umoor Office', dim: "pair, 15'6\" × 9'0\"", zone: 'admin', r: [47.5, 657.5, 74, 687.5], label: false, o: [['E', 665, 675]] });
  R2({ id: 'U5', name: 'Umoor Office', dim: "8'6\" × 11'4\"", zone: 'admin', r: [88, 587, 117, 623], label: false, o: [['W', 600, 612]] });
  R2({ id: 'U6', name: 'Umoor Office', dim: "8'6\" × 11'4\"", zone: 'admin', r: [117, 587, 145, 623], label: false, o: [['N', 125, 135]] });
  R2({ id: 'U7', name: 'Umoor Office', dim: "17'6\" × 19'6\"", zone: 'admin', r: [88, 623, 145, 687], o: [['W', 650, 662]] });
  R2({ name: 'Wash Room', zone: 'wet', r: [146, 587, 202, 673], o: [['N', 150, 158], ['S', 150, 158], ['N', 194, 201]] });
  const row1 = [[20, 55], [55, 87.5], [87.5, 119.5], [119.5, 151], [164, 214]];
  row1.forEach(([a, b], i) => R2({ id: 'C1' + i, name: 'Class Room', zone: 'edu', r: [a, 687.5, b, 720], nw: i === 0 ? ['W'] : [], label: i === 4, o: [['S', b - 12, b - 4]] }));
  const xs = [20, 55, 88, 119.5, 151, 184.5, 217];
  for (let i = 0; i < 6; i++) R2({ id: 'C2' + i, name: 'Class Room', zone: 'edu', r: [xs[i], 732.5, xs[i + 1], 767], nw: ['S'].concat(i === 0 ? ['W'] : []).concat(i === 5 ? ['E'] : []), label: false, o: [['N', xs[i] + 4, xs[i] + 12]] });
  { const a = PP(EXr[0], EXr[1]), b = PP(EXr[2], EXr[3]);
    box(b[0] - a[0] + 2.6, 1, b[1] - a[1] + 1.6, M.roof, G.roofs, (a[0] + b[0]) / 2, 1 + 12 + 0.5, (a[1] + b[1]) / 2 + 0.5, 'madressah_roof');
    if (!opt.cut) parapet(a[0] - 1, a[1], b[0] + 1, b[1] + 1, 1 + 12 + 1, 'WSE');
    if (!opt.cut) {
      box(5, 0.6, PZ(740) - PZ(560), M.trim, G.roofs, b[0] + 3.6, 1 + 9.3, (PZ(560) + PZ(740)) / 2, 'madressah_canopy');
      [570, 620, 680, 730].forEach(y => mesh(new THREE.CylinderGeometry(0.35, 0.35, 9, 10), M.trim, G.walls, b[0] + 5.6, 1 + 4.5, PZ(y), 'canopy_post'));
    }
  }

  // DOME — square tower, arched lantern, dome, gold finial (after the reference photo)
  const mcx = PX(416.25), mcz = PZ(131.25), mTop = 3 + TWO + 1;
  if (!opt.cut) {
    const tw = 26, tH = 9, tg = G.dome;
    box(tw, tH, tw, M.wall, tg, mcx, mTop + tH / 2, mcz, 'dome_tower');
    for (let f = 0; f < 4; f++) { const ang = f * Math.PI / 2; archOnFace(tg, mcx + Math.sin(ang) * (tw / 2 + 0.02), mTop + 1.5, mcz + Math.cos(ang) * (tw / 2 + 0.02), ang, 3.6, 6.2); }
    let y = mTop + tH;
    box(tw + 2.4, 0.7, tw + 2.4, M.trim, tg, mcx, y + 0.35, mcz, 'tower_cornice');
    box(tw + 3.0, 0.5, tw + 3.0, M.trim, tg, mcx, y + 0.95, mcz, 'tower_coping');
    y += 1.2;
    const lw = 17, lH = 11;
    box(lw, lH, lw, M.wall, tg, mcx, y + lH / 2, mcz, 'lantern');
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => box(1.5, lH, 1.5, M.stone, tg, mcx + a * (lw / 2 - 0.4), y + lH / 2, mcz + b * (lw / 2 - 0.4), 'lantern_pilaster'));
    for (let f = 0; f < 4; f++) {
      const ang = f * Math.PI / 2, nx = Math.sin(ang), nz = Math.cos(ang), tx = Math.cos(ang), tz = -Math.sin(ang);
      [-3.4, 3.4].forEach(off => archOnFace(tg, mcx + nx * (lw / 2 + 0.02) + tx * off, y + 1.6, mcz + nz * (lw / 2 + 0.02) + tz * off, ang, 3.0, 7.2));
    }
    y += lH;
    box(lw + 1.6, 0.6, lw + 1.6, M.trim, tg, mcx, y + 0.3, mcz, 'lantern_cornice');
    box(lw + 2.2, 0.4, lw + 2.2, M.trim, tg, mcx, y + 0.8, mcz, 'lantern_coping');
    y += 1.0;
    mesh(new THREE.CylinderGeometry(7.9, 8.1, 0.8, 48), M.trim, tg, mcx, y + 0.4, mcz, 'dome_ring');
    y += 0.8;
    const prof = [[0, 0], [7.6, 0], [7.85, 1.2], [7.85, 2.6], [7.6, 4.2], [7.0, 6.0], [6.0, 7.9], [4.7, 9.6], [3.2, 11.0], [1.8, 12.0], [0.7, 12.6], [0, 12.8]].map(p => new THREE.Vector2(p[0], p[1]));
    mesh(new THREE.LatheGeometry(prof, 64), M.dome, tg, mcx, y, mcz, 'dome');
    y += 12.6;
    const fin = [[0, 0], [0.9, 0], [0.9, 0.3], [0.45, 0.55], [0.8, 0.9], [0.95, 1.3], [0.8, 1.7], [0.3, 2.0], [0.55, 2.3], [0.6, 2.55], [0.3, 2.8], [0.42, 3.0], [0.42, 3.2], [0.2, 3.4], [0.12, 4.6], [0, 6.2]].map(p => new THREE.Vector2(p[0], p[1]));
    mesh(new THREE.LatheGeometry(fin, 24), M.gold, tg, mcx, y, mcz, 'finial');
  }

  // ENTRANCE PORCH: columns at the foyer face and the front, canopy, steps
  const thr = { x0: PX(375), x1: PX(456), z0: PZ(435), z1: PZ(481) }, ecx = (thr.x0 + thr.x1) / 2;
  [[PX(385), PZ(441)], [PX(446), PZ(441)], [thr.x0 + 1.2, thr.z1 - 1.2], [thr.x1 - 1.2, thr.z1 - 1.2]].forEach(([x, z]) => {
    const ch = opt.cut ? opt.cut : 14; mesh(new THREE.CylinderGeometry(0.85, 0.95, ch, 20), M.stone, G.walls, x, 2 + ch / 2, z, 'porch_column');
  });
  if (!opt.cut) {
    box(thr.x1 - thr.x0 + 1.5, 1.4, thr.z1 - thr.z0 + 1, M.trim, G.roofs, ecx, 16.7, (thr.z0 + thr.z1) / 2, 'porch_canopy');
    box(thr.x1 - thr.x0 + 2.5, 0.5, thr.z1 - thr.z0 + 2, M.trim, G.roofs, ecx, 17.6, (thr.z0 + thr.z1) / 2, 'porch_coping');
  }
  for (let i = 0; i < 4; i++) box(thr.x1 - thr.x0, 0.5, 1.1, M.pave, G.site, ecx, 0.25 + (3 - i) * 0.5, thr.z1 + 0.55 + i * 1.1, 'step');
  const stepsEnd = thr.z1 + 4.4;
  { // ACCESSIBLE RAMP — 1:12 slope, 5 ft wide, along the building front from the porch down to a landing, then a walk to the plaza
    const top = 2, len = top * 12, zr0 = PZ(450) + 2.4, zr1 = zr0 + 5, xTop = thr.x0, xBot = xTop - len;
    const pr = new THREE.Shape(); pr.moveTo(0, 0); pr.lineTo(len, 0); pr.lineTo(len, top); pr.lineTo(0, 0.02);
    const rg = new THREE.ExtrudeGeometry(pr, { depth: zr1 - zr0, bevelEnabled: false }); mesh(rg, M.pave, G.site, xBot, 0, zr0, 'ramp');
    flat([[xBot - 5, zr0], [xBot, zr0], [xBot, zr1], [xBot - 5, zr1]], 0, M.pave, G.site, 'ramp_landing', 0.12);
    const ang = Math.atan2(top, len), hl = Math.hypot(len, top);
    [zr0 + 0.15, zr1 - 0.15].forEach(z => {
      for (let i = 0; i <= 6; i++) { const x = xBot + len * i / 6, y = top * i / 6; mesh(new THREE.CylinderGeometry(0.07, 0.07, 3, 8), M.doorFrame, G.site, x, y + 1.5, z, 'ramp_post'); }
      const h = mesh(new THREE.CylinderGeometry(0.09, 0.09, hl + 1, 8), M.doorFrame, G.site, xBot + len / 2, top / 2 + 3, z, 'ramp_handrail'); h.rotation.z = Math.PI / 2 - ang;
      const m2 = mesh(new THREE.CylinderGeometry(0.05, 0.05, hl, 8), M.doorFrame, G.site, xBot + len / 2, top / 2 + 1.6, z, 'ramp_midrail'); m2.rotation.z = Math.PI / 2 - ang;
    });
    // walk from the landing to the entry plaza
    flat([[xBot - 5, zr1], [xBot, zr1], [xBot, stepsEnd + 4], [xBot - 5, stepsEnd + 4]], 0, M.pave, G.site, 'ramp_walk', 0.12);
    flat([[xBot - 5, stepsEnd], [ecx - 21, stepsEnd], [ecx - 21, stepsEnd + 4], [xBot - 5, stepsEnd + 4]], 0, M.pave, G.site, 'ramp_walk', 0.12);
    labels.push({ name: 'Ramp', dim: '1:12 slope', site: true, x: xBot + len / 2, y: 6, z: (zr0 + zr1) / 2 });
  }

  // STAIRS & LIFT (up flight on the east, down flight on the west, landing at the north)
  for (let i = 0; i < 15; i++) {
    box(PX(549) - PX(540), 0.5, 1, M.pave, G.furniture, (PX(540) + PX(549)) / 2, 2.5 + (i + 1) * 0.5 - 0.25, PZ(450) - i, 'stair');
    box(PX(524) - PX(504), 0.5, 1, M.pave, G.furniture, (PX(504) + PX(524)) / 2, 2.5 + 7.5 + (i + 1) * 0.5 - 0.25, PZ(450) - 14 + i, 'stair');
  }
  box(PX(549) - PX(504), 0.5, 3.5, M.pave, G.furniture, (PX(504) + PX(549)) / 2, 2.5 + 7.5 - 0.25, PZ(450) - 16.5, 'landing');
  const shaftH = opt.cut ? opt.cut : TWO + 3;
  box(PX(538.75) - PX(526), shaftH, PZ(442.5) - PZ(410), M.dark, G.walls, (PX(526) + PX(538.75)) / 2, 2.5 + shaftH / 2, (PZ(410) + PZ(442.5)) / 2, 'lift_shaft');

  // FURNITURE
  if (opt.furniture) {
    const F = G.furniture;
    for (let py = 92; py <= 245; py += 12.8) box(PX(500) - PX(333), 0.04, 0.25, M.saff, F, (PX(333) + PX(500)) / 2, 3.1, PZ(py), 'saff_line');
    for (let i = 0; i < 4; i++) box(3, 1 + i, 1.2, M.wood, F, PX(437), 3.5 + i * 0.5, PZ(84) + 1 + i * 1.2, 'minbar');
    const thGeo = new THREE.CylinderGeometry(2.4, 2.4, 0.25, 24), standGeo = new THREE.CylinderGeometry(0.9, 1.1, 0.9, 12);
    for (let r = 0; r < 7; r++) for (let c = 0; c < 12; c++) { const x = PX(113 + c * 18.5), z = PZ(236 + r * 27); mesh(standGeo, M.wood, F, x, 3.5, z, 'thaal_stand'); mesh(thGeo, M.brass, F, x, 4.05, z, 'thaal'); }
    for (let r = 0; r < 5; r++) for (let c = 0; c < 2; c++) mesh(new THREE.CylinderGeometry(1.6, 1.6, 5.5, 18), M.steel, F, PX(111 + c * 6), 1 + 2.75, PZ(461 + r * 12), 'thaal_rack');
    [[110, 135], [137, 162], [164, 190]].forEach(([a, b]) => box(PX(b) - PX(a), 3, 1.8, M.steel, F, (PX(a) + PX(b)) / 2, 2.5, PZ(450), 'service_platform'));
    box(PX(140) - PX(117), 3, 0.8, std(0x5aa86a), F, (PX(117) + PX(140)) / 2, 2.5, PZ(480), 'service_window_counter');
    box(PX(180) - PX(174), 3, PZ(564) - PZ(487), M.steel, F, (PX(174) + PX(180)) / 2, 2.5, (PZ(487) + PZ(564)) / 2, 'prep_counter_veg_nonveg');
    box(PX(211) - PX(206), 3, PZ(560) - PZ(486), M.steel, F, (PX(206) + PX(211)) / 2, 2.5, (PZ(486) + PZ(560)) / 2, 'kitchen_counter');
    box(PX(203) - PX(196), 3, PZ(532) - PZ(505), M.steel, F, (PX(196) + PX(203)) / 2, 2.5, (PZ(505) + PZ(532)) / 2, 'cooking_range');
    [595, 617, 638, 660].forEach(y => box(PX(201) - PX(180), 7, 0.3, M.dark, F, (PX(180) + PX(201)) / 2, 4.5, PZ(y), 'stall'));
    [604, 626, 646, 666].forEach(y => toilet(PX(188), 1, PZ(y)));
    const desk = (x, z) => box(3.4, 2.5, 1.8, M.wood, F, x, 2.25, z, 'desk');
    row1.forEach(([a, b]) => { for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++) desk(PX(a + (b - a) * (0.3 + 0.4 * k)), PZ(696 + j * 13)); });
    for (let i = 0; i < 6; i++) for (let k = 0; k < 2; k++) for (let j = 0; j < 3; j++) desk(PX(xs[i] + (xs[i + 1] - xs[i]) * (0.3 + 0.4 * k)), PZ(741 + j * 9));
    box(8, 2.6, 3, M.wood, F, PX(46), 2.3, PZ(517), 'aamil_desk');
    box(9, 2.2, 3, std(0x6b5a4a), F, PX(46), 2.1, PZ(555), 'aamil_sofa');
    box(9, 2.5, 4, M.wood, F, PX(47), 2.25, PZ(608), 'meeting_table');
    [[90, 99], [102, 111], [114, 123]].forEach(([a, b]) => box(PX(b) - PX(a), 1.6, 1.6, M.brass, F, (PX(a) + PX(b)) / 2, 1.8, PZ(570), 'waiting_bench'));
    mesh(new THREE.CylinderGeometry(2.6, 2.8, 1.2, 24), M.pave, F, PX(55), 1.6, PZ(480), 'garden_fountain');
    mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.2, 24), M.water, F, PX(55), 2.15, PZ(480), 'garden_water');
    [[38, 462], [45, 490], [62, 458], [66, 492], [30, 478]].forEach(([px, py]) => {
      mesh(new THREE.CylinderGeometry(0.35, 0.45, 5, 8), M.trunk, F, PX(px), 3.5, PZ(py), 'garden_tree');
      mesh(new THREE.SphereGeometry(2.4, 12, 10), M.leaf, F, PX(px), 7.2, PZ(py), 'garden_tree');
    });
  }

  // ═════════ SITE — traced from aerial imagery of 3812 Barney Rd ═════════
  const K = 0.3048 / 0.4222, C0 = 394.2, C1 = 112.1, exC = PP(119.25, 624.5), A0 = exC[0], A1 = exC[1], UX = [0.35837, 0.93358], UZ = [-0.93358, 0.35837];
  const U = (u, v) => { const ox = (u / 3 + 175 - C0) / K, oy = (v / 3 - C1) / K; return [A0 + ox * UX[0] + oy * UX[1], A1 + ox * UZ[0] + oy * UZ[1]]; };
  const UL = a => a.map(p => U(p[0], p[1]));
  const SITE = G.site, LAND = G.landscape;
  const ground = box(2600, 0.4, 2600, M.grass, SITE, 100, -0.2, 120, 'ground'); ground.castShadow = false;
  const clearingU = [[380, 430], [390, 330], [470, 280], [520, 250], [600, 200], [700, 150], [800, 100], [900, 75], [1000, 70], [1100, 100], [1200, 170], [1300, 240], [1345, 300],
    [1040, 740], [945, 880], [905, 960], [860, 1060], [760, 1060], [640, 985], [520, 925], [400, 860], [300, 760], [230, 700], [215, 600], [290, 560], [370, 520]];
  flat(UL(clearingU), 0.02, M.lawn, SITE, 'lawn').receiveShadow = true;

  // Barney Rd
  const rc0 = U(735, 1350), rc1 = U(1340, 300), rdx = rc1[0] - rc0[0], rdz = rc1[1] - rc0[1], rl = Math.hypot(rdx, rdz), rd = [rdx / rl, rdz / rl], rn0 = [-rd[1], rd[0]];
  const along = (p, s) => [p[0] + rd[0] * s, p[1] + rd[1] * s];
  const r0 = along(rc0, -500), r1 = along(rc1, 500);
  const sideSign = ((100 - rc0[0]) * rn0[0] + (100 - rc0[1]) * rn0[1]) > 0 ? 1 : -1, nS = [rn0[0] * sideSign, rn0[1] * sideSign];
  const off = (p, d) => [p[0] + nS[0] * d, p[1] + nS[1] * d];
  seg2(r0, r1, 30, 0.12, 0, M.road, SITE, 'barney_rd');
  for (let s = 0; s < rl + 1000; s += 20) seg2(along(r0, s), along(r0, s + 10), 0.5, 0.02, 0.12, M.yellow, SITE, 'centre_line');
  seg2(off(r0, 15.6), off(r1, 15.6), 1.2, 0.5, 0, M.curb, SITE, 'curb');
  seg2(off(r0, 20), off(r1, 20), 5, 0.3, 0, M.pave, SITE, 'sidewalk');
  seg2(off(r0, -15.6), off(r1, -15.6), 1.2, 0.5, 0, M.curb, SITE, 'curb');
  flat([off(r0, -17), off(r1, -17), off(r1, -400), off(r0, -400)], 0.04, M.gravel, SITE, 'neighbouring_yard');
  { const lp = along(rc0, rl * 0.78); labels.push({ name: 'Barney Rd', dim: '', site: true, x: off(lp, -2)[0], y: 3, z: off(lp, -2)[1] }); }
  const proj = p => (p[0] - rc0[0]) * rd[0] + (p[1] - rc0[1]) * rd[1];

  // Parking lot (existing)
  const lotU = [[385, 520], [400, 455], [425, 425], [520, 422], [605, 458], [690, 500], [705, 600], [700, 640], [780, 660], [905, 745], [915, 795], [895, 820], [860, 850], [835, 895], [810, 880], [415, 630], [410, 585], [380, 560]];
  const lotL = UL(lotU);
  const AY = 0.25; // all paving sits at one level so the lot, circle and drive read as one surface
  flat(lotL, AY, M.asphalt, SITE, 'parking_lot');
  const ccPre = [ecx, stepsEnd + 22 + 38], CRp = 38;
  // join the circle to the lot: convex hull of the circle and the lot corners next to it
  { const pts = [];
    for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2; pts.push([ccPre[0] + Math.cos(a) * CRp, ccPre[1] + Math.sin(a) * CRp]); }
    lotL.forEach(p => { if (Math.hypot(p[0] - ccPre[0], p[1] - ccPre[1]) < 75) pts.push(p); });
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], hi = [];
    pts.forEach(p => { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); });
    pts.slice().reverse().forEach(p => { while (hi.length > 1 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); });
    flat(lo.slice(0, -1).concat(hi.slice(0, -1)), AY, M.asphalt, SITE, 'lot_circle_join'); }
  const islandP = (pts, nm) => { flat(pts, 0.0, M.curb, SITE, nm + '_curb', 0.55); flat(pts, 0.56, M.lawn, SITE, nm); };
  const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const islands = [], stripes = [];
  const segX = (a, b, c2, d2) => { const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); return o(a, b, c2) !== o(a, b, d2) && o(c2, d2, a) !== o(c2, d2, b); };
  const addStripe = (a, b) => {
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    for (const P of islands) if (inPoly(a, P) || inPoly(b, P) || inPoly(m, P)) return;
    for (const [p, q] of stripes) if (segX(a, b, p, q)) return;
    stripes.push([a, b]); seg2(a, b, 0.45, 0.03, AY + 0.01, M.stripe, SITE, 'stall_line');
  };
  { // parking grid aligned to the lot's long edge (traced from the aerial): rows, a straight grass island, aisles
    const O = U(415, 630), E = U(835, 895), LL = Math.hypot(E[0] - O[0], E[1] - O[1]), d = [(E[0] - O[0]) / LL, (E[1] - O[1]) / LL];
    let n = [-d[1], d[0]]; if ((ccPre[0] - O[0]) * n[0] + (ccPre[1] - O[1]) * n[1] < 0) n = [-n[0], -n[1]];
    const P = (s, t) => [O[0] + d[0] * s + n[0] * t, O[1] + d[1] * s + n[1] * t];
    const inLot = p => inPoly(p, lotL);
    // grass island between the two middle rows, ending short of the drop-off circle
    let sA = -60; while (sA < 0 && !(inLot(P(sA, 60.5)) && inLot(P(sA, 68.5)))) sA += 1;
    let sB = sA; while (Math.min(dist(P(sB + 1, 60.5), ccPre), dist(P(sB + 1, 68.5), ccPre)) > CRp + 12 && sB < 140) sB += 1;
    const isl = [P(sA, 60.5), P(sB, 60.5), P(sB, 68.5), P(sA, 68.5)];
    islandP(isl, 'centre_island'); islands.push(isl);
    const row = (t0, t1, sMin, sMax) => { for (let s = -54; s <= 240; s += 9) { if (s < sMin || s > sMax) continue; addStripe(P(s, t0), P(s, t1)); } };
    const ok = (a, b) => inLot(a) && inLot(b) && Math.min(dist(a, ccPre), dist(b, ccPre)) > CRp + 8;
    const row2 = (t0, t1, sMin, sMax) => { for (let s = -54; s <= 240; s += 9) { if (s < sMin || s > sMax) continue; const a = P(s, t0), b = P(s, t1); if (ok(a, b)) addStripe(a, b); } };
    row2(0.8, 18.5, -60, 240);          // along the long edge
    row2(42.5, 60.2, -60, sB);         // facing the island, south side
    row2(68.8, 86.5, -60, sB);         // facing the island, north side
    row2(57.5, 75.2, 126, 240);         // east arm, against its edge
  }
  labels.push({ name: 'Parking', dim: '', site: true, x: U(560, 600)[0], y: 3, z: U(560, 600)[1] });
  flat(UL([[510, 810], [590, 830], [580, 875], [505, 860]]), 0.05, M.sand, SITE, 'play_area');

  // ── DROP-OFF CIRCLE + ENTRY PLAZA, centred on the main entrance ──
  const CR = 38, ISL = 13, plazaDepth = 22, cc = [ecx, stepsEnd + plazaDepth + CR];
  { const cg = new THREE.CircleGeometry(CR, 96); cg.rotateX(-Math.PI / 2); mesh(cg, M.asphalt, SITE, cc[0], AY, cc[1], 'drop_off_circle').castShadow = false; }
  // island: curb ring, soil, clipped hedge ring, flower rings, fountain at the centre
  mesh(new THREE.CylinderGeometry(ISL + 0.8, ISL + 0.8, 0.7, 64), M.curb, LAND, cc[0], 0.35, cc[1], 'island_curb');
  mesh(new THREE.CylinderGeometry(ISL, ISL, 0.12, 64), M.soil, LAND, cc[0], 0.76, cc[1], 'island_bed');
  { const hg = []; for (let i = 0; i < 44; i++) { const a = i / 44 * Math.PI * 2, g = new THREE.IcosahedronGeometry(1.05, 0); g.scale(1, 0.75, 1); g.translate(cc[0] + Math.cos(a) * (ISL - 1.1), 1.4, cc[1] + Math.sin(a) * (ISL - 1.1)); hg.push(g); }
    mesh(mergeGeos(hg), M.hedge, LAND, 0, 0, 0, 'island_hedge_ring'); }
  [[ISL - 3.0, ISL - 2.1, [0]], [ISL - 4.6, ISL - 3.2, [3]], [ISL - 6.4, ISL - 4.8, [1]], [ISL - 8.0, ISL - 6.6, [2]]].forEach(([ri, ro, pal], k) =>
    flowers((x, z) => { const r = Math.hypot(x - cc[0], z - cc[1]); return r > ri && r < ro; }, [cc[0] - ro, cc[1] - ro, cc[0] + ro, cc[1] + ro], 0.8, 3.2, LAND, pal, 'island_ring' + k));
  mesh(new THREE.CylinderGeometry(4.2, 4.5, 1.2, 32), M.stone, LAND, cc[0], 1.4, cc[1], 'fountain_basin');
  mesh(new THREE.CylinderGeometry(3.8, 3.8, 0.2, 32), M.water, LAND, cc[0], 2.0, cc[1], 'fountain_water');
  mesh(new THREE.CylinderGeometry(0.5, 0.8, 3.2, 16), M.stone, LAND, cc[0], 3.4, cc[1], 'fountain_column');
  mesh(new THREE.CylinderGeometry(1.8, 1.2, 0.5, 24), M.stone, LAND, cc[0], 5.1, cc[1], 'fountain_bowl');
  mesh(new THREE.LatheGeometry([[0, 0], [0.5, 0], [0.55, 0.4], [0.35, 0.8], [0, 1.2]].map(q => new THREE.Vector2(q[0], q[1])), 16), M.gold, LAND, cc[0], 5.35, cc[1], 'fountain_finial');

  // entry plaza between the steps and the circle; its front edge follows the curb
  const pw = 22, PR = CR + 1.2, plazaPts = [[ecx - pw, stepsEnd - 0.2], [ecx + pw, stepsEnd - 0.2]];
  const arcA = Math.asin(Math.min(1, pw / PR));
  for (let i = 0; i <= 24; i++) { const a = -Math.PI / 2 + arcA - (2 * arcA * i / 24); plazaPts.push([cc[0] + Math.cos(a) * PR, cc[1] + Math.sin(a) * PR]); }
  flat(plazaPts, 0, M.pave, LAND, 'entry_plaza', 0.4);
  for (let z = stepsEnd + 1.5; z < cc[1] - PR - 1; z += 3) box(15, 0.03, 0.35, M.paveDark, LAND, ecx, 0.42, z, 'plaza_band');
  [-1, 1].forEach(sg => {
    const xa = ecx + sg * 9.5, xb = ecx + sg * 19.5, zA = stepsEnd + 2.5, zB = stepsEnd + plazaDepth - 5;
    const bx = Math.min(xa, xb), bX = Math.max(xa, xb);
    flat([[bx, zA], [bX, zA], [bX, zB], [bx, zB]], 0.0, M.curb, LAND, 'plaza_bed_curb', 0.6);
    flat([[bx + 0.6, zA + 0.6], [bX - 0.6, zA + 0.6], [bX - 0.6, zB - 0.6], [bx + 0.6, zB - 0.6]], 0.61, M.soil, LAND, 'plaza_bed');
    flowers((x, z) => x > bx + 0.9 && x < bX - 0.9 && z > zA + 0.9 && z < zB - 0.9, [bx, zA, bX, zB], 0.6, 2.4, LAND, [0, 1, 2, 3, 5], 'plaza_bed');
    lampPost(ecx + sg * 8.3, zA + 0.5, LAND); lampPost(ecx + sg * 8.3, zB - 0.5, LAND);
  });
  labels.push({ name: 'Entry plaza', dim: '', site: true, x: ecx, y: 3, z: stepsEnd + plazaDepth / 2 + 2 });
  // walkway from the plaza along the dine area to the Madressah entrances
  const madE = PX(219) + 10.5;
  const wz = stepsEnd + 7;
  // planting along the building front
  hedgeLine([PX(330) - 2, PZ(450)], [madE + 6, PZ(450)], LAND, 'hedge_dine');
  hedgeLine([PX(503.5) + 2, PZ(467)], [PX(550) + 2, PZ(467)], LAND, 'hedge_wing');
  hedgeLine([PX(331), PZ(450)], [PX(373), PZ(450)], LAND, 'hedge_men');
  hedgeLine([PX(458), PZ(450)], [PX(500), PZ(450)], LAND, 'hedge_women');
  flowers((x, z) => true, [PX(331) + 1, PZ(452), PX(373) - 1, PZ(455)], 0.1, 2.2, LAND, [0, 1, 3], 'front_bed_w');
  flowers((x, z) => true, [PX(458) + 1, PZ(452), PX(500) - 1, PZ(455)], 0.1, 2.2, LAND, [0, 1, 3], 'front_bed_e');

  // ── FENCE along Barney Rd on both sides of the gate ──
  const FO = 26;
  const dA = U(865, 845), dB = U(950, 890);
  const gc = (() => {
    const p0 = off(rc0, FO), dd = [dB[0] - dA[0], dB[1] - dA[1]];
    const den = dd[0] * rd[1] - dd[1] * rd[0], t = ((p0[0] - dA[0]) * rd[1] - (p0[1] - dA[1]) * rd[0]) / den;
    return [dA[0] + dd[0] * t, dA[1] + dd[1] * t];
  })();
  const span = 34, sG = proj(gc);
  { // entrance drive: a straight 30 ft lane from the end of the lot, through the gate, to the road edge
    const u0 = [dB[0] - dA[0], dB[1] - dA[1]], ul = Math.hypot(...u0), u = [u0[0] / ul, u0[1] / ul], w = [-u[1] * 15, u[0] * 15];
    const dRoad = p => (p[0] - rc0[0]) * nS[0] + (p[1] - rc0[1]) * nS[1];
    const k = (dRoad(gc) - 14) / -(u[0] * nS[0] + u[1] * nS[1]);
    const a = [gc[0] - u[0] * 40, gc[1] - u[1] * 40], b = [gc[0] + u[0] * k, gc[1] + u[1] * k];
    flat([[a[0] + w[0], a[1] + w[1]], [b[0] + w[0], b[1] + w[1]], [b[0] - w[0], b[1] - w[1]], [a[0] - w[0], a[1] - w[1]]], AY, M.asphalt, SITE, 'entrance_drive');
  }
  const fenceTo = (s0, s1, nm) => {
    const a = off(along(rc0, s0), FO), b = off(along(rc0, s1), FO), L = Math.abs(s1 - s0), dir = Math.sign(s1 - s0);
    const pick = [], tips = [], nPier = Math.max(1, Math.round(L / 24));
    for (let i = 0; i <= nPier; i++) {
      const p = off(along(rc0, s0 + dir * L * i / nPier), FO);
      box(1.6, 6.2, 1.6, M.stone, SITE, p[0], 3.1, p[1], nm + '_pier'); box(2.1, 0.4, 2.1, M.trim, SITE, p[0], 6.4, p[1], nm + '_pier_cap');
    }
    seg2(a, b, 0.25, 0.25, 0.7, M.iron, SITE, nm + '_rail'); seg2(a, b, 0.25, 0.25, 4.9, M.iron, SITE, nm + '_rail');
    for (let s = 0.6; s < L - 0.3; s += 0.55) {
      const p = off(along(rc0, s0 + dir * s), FO), g = new THREE.BoxGeometry(0.09, 4.8, 0.09); g.translate(p[0], 3.0, p[1]); pick.push(g);
      const tip = new THREE.ConeGeometry(0.12, 0.45, 4); tip.translate(p[0], 5.6, p[1]); tips.push(tip);
    }
    mesh(mergeGeos(pick), M.iron, SITE, 0, 0, 0, nm + '_pickets').castShadow = false;
    mesh(mergeGeos(tips), M.gold, SITE, 0, 0, 0, nm + '_spears').castShadow = false;
  };
  const sNorth = proj(U(1300, 240)), sSouth = proj(U(860, 1060));
  fenceTo(sG + span / 2 + 1.6, Math.max(sNorth, sG + 60), 'fence_north');
  fenceTo(sG - span / 2 - 1.6, Math.min(sSouth, sG - 250), 'fence_south');
  { const lp = off(along(rc0, sG + 110), FO); labels.push({ name: 'Fence', dim: 'Along Barney Rd', site: true, x: lp[0], y: 9, z: lp[1] }); }

  // ── MAIN GATE, in line with the fence ──
  {
    const pA = off(along(rc0, sG - span / 2 - 1.6), FO), pB = off(along(rc0, sG + span / 2 + 1.6), FO);
    const gG = new THREE.Group(); gG.name = 'main_gate'; SITE.add(gG);
    [pA, pB].forEach(p => {
      box(3.2, 10, 3.2, M.stone, gG, p[0], 5, p[1], 'gate_pillar');
      box(4, 0.6, 4, M.trim, gG, p[0], 10.3, p[1], 'gate_pillar_cap');
      mesh(new THREE.LatheGeometry([[0, 0], [1.35, 0], [1.4, 0.5], [1.25, 1.1], [0.85, 1.75], [0.35, 2.15], [0, 2.3]].map(q => new THREE.Vector2(q[0], q[1])), 24), M.dome, gG, p[0], 10.6, p[1], 'gate_pillar_dome');
      mesh(new THREE.LatheGeometry([[0, 0], [0.2, 0], [0.25, 0.3], [0.1, 0.5], [0.05, 1.2], [0, 1.4]].map(q => new THREE.Vector2(q[0], q[1])), 12), M.gold, gG, p[0], 12.85, p[1], 'gate_finial');
    });
    const inward = [-nS[0], -nS[1]];
    [[pA, 1], [pB, -1]].forEach(([p, s]) => {
      const hinge = along(p, 1.6 * s), leaf = new THREE.Group(); leaf.name = 'gate_leaf';
      leaf.position.set(hinge[0], 0, hinge[1]); gG.add(leaf);
      const W = span / 2 - 0.2;
      [0.6, 6.6].forEach(y => box(W, 0.3, 0.3, M.iron, leaf, W / 2, y, 0, 'gate_rail'));
      for (let i = 0; i <= 16; i++) { const hgt = 6.2 + Math.sin(Math.PI * i / 16) * 1.4; box(0.12, hgt, 0.12, M.iron, leaf, (i / 16) * W, 0.6 + hgt / 2, 0, 'gate_bar'); box(0.14, 0.45, 0.14, M.gold, leaf, (i / 16) * W, 0.6 + hgt + 0.2, 0, 'gate_spear'); }
      const base = Math.atan2(rd[1] * s, rd[0] * s), open = Math.atan2(inward[1], inward[0]);
      let df = open - base; while (df > Math.PI) df -= 2 * Math.PI; while (df < -Math.PI) df += 2 * Math.PI;
      leaf.rotation.y = -(base + df * 0.72);
    });
    labels.push({ name: 'Main gate', dim: 'Entrance from Barney Rd', site: true, x: gc[0], y: 16, z: gc[1] });
  }

  // ── WOODS ──
  if (opt.trees) {
    const tr = [], c1 = [], c2 = [];
    for (let v = -500; v <= 1900; v += 48) for (let u = -600; u <= 1700; u += 48) {
      const pu = u + (rnd() - 0.5) * 40, pv = v + (rnd() - 0.5) * 40;
      const roadU = 735 + (1350 - pv) / 1050 * 605;
      if (pu > roadU - 95) continue;
      if (inPoly([pu, pv], clearingU)) continue;
      const p = U(pu, pv), s = 0.75 + rnd() * 0.6, hgt = 18 + rnd() * 18;
      const tg = new THREE.CylinderGeometry(0.5 * s, 0.8 * s, hgt * 0.55, 6); tg.translate(p[0], hgt * 0.275, p[1]); tr.push(tg);
      const cg = new THREE.IcosahedronGeometry(7 * s + rnd() * 3, 0); cg.scale(1, 1.25, 1); cg.translate(p[0], hgt * 0.62 + 4, p[1]);
      (rnd() > 0.5 ? c1 : c2).push(cg);
    }
    if (tr.length) {
      mesh(mergeGeos(tr), M.trunk, G.trees, 0, 0, 0, 'woods_trunks').castShadow = false;
      mesh(mergeGeos(c1), M.leaf, G.trees, 0, 0, 0, 'woods_canopy_a');
      mesh(mergeGeos(c2), M.leaf2, G.trees, 0, 0, 0, 'woods_canopy_b');
    }
    for (let s = sG + span / 2 + 20; s < sNorth - 10; s += 45) { const p = off(along(rc0, s), FO + 12); mesh(new THREE.CylinderGeometry(0.5, 0.7, 7, 8), M.trunk, G.trees, p[0], 3.5, p[1]); mesh(new THREE.IcosahedronGeometry(4.5, 1), M.leaf, G.trees, p[0], 9.5, p[1], 'street_tree'); }
  }

  const north = new THREE.Vector3(-UX[1], 0, -UZ[1]).normalize();
  // ── MINARETS — four, on the corners of the Masjid roof only (after the reference photo) ──
  if (!opt.cut) {
    const glow = std(0xffd88a, { emissive: 0xd99a3a, emissiveIntensity: 0.55, roughness: 0.4 });
    const yR = 3 + TWO + 1, mx0 = PX(329.5), mx1 = PX(503.5), mz0 = PZ(79), mz1 = PZ(252), ins = 4.6;
    const litArch = (cx, cy, cz, ang, w, h) => { const g = new THREE.ExtrudeGeometry(pArch(w, h).s, { depth: 0.12, bevelEnabled: false, curveSegments: 10 }); const m = new THREE.Mesh(g, glow); m.position.set(cx, cy, cz); m.rotation.y = ang; m.name = 'minaret_window'; G.dome.add(m); };
    [[mx0 + ins, mz0 + ins], [mx1 - ins, mz0 + ins], [mx0 + ins, mz1 - ins], [mx1 - ins, mz1 - ins]].forEach(([x, z]) => {
      let y = yR; const sw = 6.6, sh = 19;
      box(sw, sh, sw, M.wall, G.dome, x, y + sh / 2, z, 'minaret_shaft');
      y += sh;
      box(sw + 1.1, 0.7, sw + 1.1, M.trim, G.dome, x, y + 0.35, z, 'minaret_cornice'); y += 0.7;
      for (let f = 0; f < 4; f++) { const ang = f * Math.PI / 2, nx = Math.sin(ang), nz = Math.cos(ang), tx = Math.cos(ang), tz = -Math.sin(ang);
        for (let k = -2; k <= 2; k++) box(0.55, 0.7, 0.3, M.trim, G.dome, x + nx * (sw + 0.8) / 2 + tx * k * 1.45, y + 0.35, z + nz * (sw + 0.8) / 2 + tz * k * 1.45, 'minaret_merlon'); }
      const w1 = 5.4, h1 = 7.2; y += 0.2;
      box(w1, h1, w1, M.wall, G.dome, x, y + h1 / 2, z, 'minaret_stage1');
      for (let f = 0; f < 4; f++) { const ang = f * Math.PI / 2; litArch(x + Math.sin(ang) * (w1 / 2 + 0.01), y + 1.2, z + Math.cos(ang) * (w1 / 2 + 0.01), ang, 2.1, 4.6); }
      y += h1; box(w1 + 0.7, 0.45, w1 + 0.7, M.trim, G.dome, x, y + 0.22, z, 'minaret_band'); y += 0.45;
      const w2 = 4.4, h2 = 4.6;
      box(w2, h2, w2, M.wall, G.dome, x, y + h2 / 2, z, 'minaret_stage2');
      for (let f = 0; f < 4; f++) { const ang = f * Math.PI / 2; litArch(x + Math.sin(ang) * (w2 / 2 + 0.01), y + 0.8, z + Math.cos(ang) * (w2 / 2 + 0.01), ang, 1.5, 3.0); }
      y += h2; box(w2 + 0.6, 0.4, w2 + 0.6, M.trim, G.dome, x, y + 0.2, z, 'minaret_band'); y += 0.4;
      const dp = [[0, 0], [2.15, 0], [2.25, 0.5], [2.1, 1.3], [1.7, 2.2], [1.05, 3.0], [0.4, 3.5], [0, 3.65]].map(q => new THREE.Vector2(q[0], q[1]));
      mesh(new THREE.LatheGeometry(dp, 32), M.dome, G.dome, x, y, z, 'minaret_dome');
      mesh(new THREE.LatheGeometry([[0, 0], [0.18, 0], [0.22, 0.25], [0.08, 0.45], [0.04, 1.1], [0, 1.3]].map(q => new THREE.Vector2(q[0], q[1])), 10), M.gold, G.dome, x, y + 3.55, z, 'minaret_finial');
    });
  }
  [[WIN.frame, M.trim, G.walls, 'window_frames'], [WIN.glass, M_winGlass, G.glass, 'window_glass'], [WIN.bar, M.trim, G.walls, 'window_mullions'], [WIN.lat, M_lattice, G.walls, 'lattice_windows'], [WIN.dglass, M.doorGlass, G.glass, 'door_fanlight'], [WIN.dbar, M.doorFrame, G.walls, 'door_fanlight_bars']]
    .forEach(([list, mat, par, nm]) => { if (list.length) { const m = mesh(mergeGeos(list), mat, par, 0, 0, 0, nm); m.castShadow = false; } });

  return { root, groups: G, labels, pickables, zones: ZONES, center: new THREE.Vector3(98.5, 0, 111), north, siteU: U, entry: { cc, gc, ecx, stepsEnd } };
}
if (typeof module !== 'undefined') module.exports = { buildMasjid };
