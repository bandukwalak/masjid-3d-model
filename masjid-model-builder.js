/* Masjid & Mawaid at 3812 Barney Rd — model builder.
   Units: feet, in the drawing's own frame: +X = right on the sheet, +Z = down the sheet.
   The site (lot, road, woods) is traced from aerial imagery and converted into this frame. */
function buildMasjid(THREE, opt) {
  opt = Object.assign({ cut: 0, furniture: true, trees: true }, opt || {});
  const TI = 0.6, TE = 1.0, GF = 15, UP = 13, TWO = GF + 1 + UP; // ground floor, slab, upper floor
  const root = new THREE.Group(); root.name = 'Masjid_Mawaid_Barney_Rd';
  const G = {};
  ['floors', 'walls', 'glass', 'upper', 'roofs', 'dome', 'furniture', 'site', 'trees'].forEach(k => { G[k] = new THREE.Group(); G[k].name = k; root.add(G[k]); });

  const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.88, metalness: 0 }, o || {}));
  const M = {
    wall: std(0xeee8dc), oldWall: std(0xcdb79a), plinth: std(0xc9bfae), roof: std(0xd8d1c4), shingle: std(0x4a4f55, { side: THREE.DoubleSide }),
    trim: std(0xf6f1e6, { roughness: 0.7 }), stone: std(0xe6dccb),
    glass: std(0x8fb2c6, { roughness: 0.1, metalness: 0.15, transparent: true, opacity: 0.5 }),
    archGlass: std(0x6f8796, { roughness: 0.15, metalness: 0.2 }),
    dome: std(0xf3efe6, { roughness: 0.5 }), gold: std(0xd4a640, { roughness: 0.28, metalness: 0.75 }),
    brass: std(0xc59a45, { roughness: 0.4, metalness: 0.5 }), steel: std(0x9aa3a8, { roughness: 0.4, metalness: 0.4 }),
    white: std(0xf7f7f5, { roughness: 0.3 }), wood: std(0x8a5d3b), leaf: std(0x46703a, { flatShading: true }), leaf2: std(0x2f5528, { flatShading: true }),
    trunk: std(0x6b4f35), water: std(0x5f9fc0, { roughness: 0.1 }), grass: std(0x5b7a42), lawn: std(0x6b8c4c), pave: std(0xc9c1b0),
    asphalt: std(0x3b3e42, { roughness: 0.95 }), road: std(0x404347, { roughness: 0.95 }), stripe: std(0xf2f2ee), yellow: std(0xe0b83a),
    curb: std(0xd9d3c6), gravel: std(0xa39d92), dark: std(0x7d8186), rail: std(0x6f6250, { roughness: 0.5, metalness: 0.4 }),
    iron: std(0x2b2d30, { roughness: 0.5, metalness: 0.6 }), sand: std(0xd8c49a), saff: std(0xd8c27a, { roughness: 0.7 })
  };
  const ZONES = {
    prayer: { c: 0x2e6b5b, n: 'Prayer' }, sahan: { c: 0xe4dfd3, n: 'Sahan & upper floor' }, dining: { c: 0xb68a60, n: 'Dining (Mawaid)' },
    service: { c: 0xa8b0b4, n: 'Kitchen & service' }, admin: { c: 0xcbb790, n: 'Offices' }, edu: { c: 0x9bb5cb, n: 'Madressah' },
    wet: { c: 0x86c0c3, n: 'Ablution & washrooms' }, circ: { c: 0xd8d0bf, n: 'Entry & circulation' }, garden: { c: 0x6f9a52, n: 'Garden' }
  };
  const labels = [], pickables = [];

  function mesh(geo, mat, parent, x, y, z, name) {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    if (name) m.name = name; parent.add(m); return m;
  }
  function box(w, h, d, mat, parent, x, y, z, name) { return mesh(new THREE.BoxGeometry(w, h, d), mat, parent, x, y, z, name); }
  // box between two plan points (for curbs, stripes, roads)
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

  // ── walls with openings at any height ──
  function wallRun(ax, fixed, a0, a1, base, h, t, ops, name, mat) {
    const hh = opt.cut ? Math.min(h, opt.cut) : h; mat = mat || M.wall;
    ops = ops.map(o => ({ s: Math.max(o.s, a0), e: Math.min(o.e, a1), v: o.v })).filter(o => o.e - o.s > 0.05);
    const bps = [...new Set([a0, a1, ...ops.flatMap(o => [o.s, o.e])])].sort((a, b) => a - b);
    const put = (s, e, y0, y1, m, tt) => {
      y1 = Math.min(y1, hh); if (e - s < 0.05 || y1 - y0 < 0.05) return;
      const L = e - s, mid = (s + e) / 2, H = y1 - y0, ym = base + y0 + H / 2;
      const g = ax === 'x' ? new THREE.BoxGeometry(L, H, tt) : new THREE.BoxGeometry(tt, H, L);
      const mm = ax === 'x' ? mesh(g, m, m === M.glass ? G.glass : G.walls, mid, ym, fixed) : mesh(g, m, m === M.glass ? G.glass : G.walls, fixed, ym, mid);
      mm.name = name; if (m === M.glass) mm.castShadow = false;
    };
    for (let i = 0; i < bps.length - 1; i++) {
      const p = bps[i], q = bps[i + 1];
      const holes = ops.filter(o => o.s <= p + 1e-6 && o.e >= q - 1e-6).flatMap(o => o.v).sort((a, b) => a[0] - b[0]);
      let y = 0;
      for (const [b, tp, gl] of holes) { if (b > y) put(p, q, y, b, mat, t); if (gl) put(p, q, b, tp, M.glass, t * 0.3); y = Math.max(y, tp); }
      put(p, q, y, hh, mat, t);
    }
  }
  function vRanges(k, two, h) {
    switch (k) {
      case 'door': return [[0, 7.5]];
      case 'gate': return [[0, 9.5]];
      case 'hatch': return [[3, 7.5]];
      case 'win': return two ? [[3, 7.5, 1], [GF + 4, GF + 8.5, 1]] : [[3, 7.5, 1]];
      case 'tall': return two ? [[2, GF - 2.5, 1], [GF + 3, TWO - 2.5, 1]] : [[2, h - 2, 1]];
      case 'uwin': return [[GF + 4, GF + 8.5, 1]];
      case 'open': return [[0, two ? GF : h]];
      case 'open2': return [[0, h]];
    }
    return [[0, 7.5]];
  }

  function room(R) {
    const [x0, z0, x1, z1] = R.r, t = R.t || (R.out ? TE : TI), fl = R.fl || 0;
    const h = R.two ? TWO : (R.h || 11), nw = R.nw || [], wmat = R.old ? M.oldWall : M.wall;
    const ops = { N: [], S: [], E: [], W: [] };
    (R.o || []).forEach(([sd, at, w, k]) => { const o = (sd === 'N' || sd === 'S' ? x0 : z0) + at; ops[sd].push({ s: o, e: o + w, v: vRanges(k || 'door', R.two, h) }); });
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
    if (R.roof !== false) {
      const ex = R.out ? t : 0;
      box(x1 - x0 + 2 * ex + 0.6, 1, z1 - z0 + 2 * ex + 0.6, M.roof, G.roofs, (x0 + x1) / 2, fl + h + 0.5, (z0 + z1) / 2, nm + '_roof');
    }
    if (R.parapet && !opt.cut) parapet(x0, z0, x1, z1, fl + h + 1, R.parapet);
    if (R.name && R.label !== false) labels.push({ name: R.name, dim: R.dim || '', big: !!R.big, x: (x0 + x1) / 2 + (R.lx || 0), y: fl + (R.big ? 12 : 5), z: (z0 + z1) / 2 + (R.lz || 0) });
    if (R.wc && opt.furniture) toilet((x0 + x1) / 2, fl, z0 + 1.6);
  }
  function toilet(x, fl, z) { box(1.4, 1.4, 2, M.white, G.furniture, x, fl + 0.7, z, 'toilet'); }

  // upper floor slab with an optional double-height void, plus a railing round the void
  function upperSlab(R, x0, z0, x1, z1, t, fl) {
    const a = x0 + t, b = z0 + t, c = x1 - t, d = z1 - t, y = fl + GF + 0.5;
    const zm = std(ZONES[R.zone === 'prayer' ? 'prayer' : 'sahan'].c, { roughness: 0.8 });
    const slab = (sx0, sz0, sx1, sz1) => { if (sx1 - sx0 > 0.1 && sz1 - sz0 > 0.1) {
      const m = mesh(new THREE.BoxGeometry(sx1 - sx0, 1, sz1 - sz0), [M.plinth, M.plinth, zm, M.trim, M.plinth, M.plinth], G.upper, (sx0 + sx1) / 2, y, (sz0 + sz1) / 2, 'upper_slab');
      if (R.upperName) { m.userData = { name: R.upperName, dim: R.upperDim || '', zone: 'Upper floor', level: 'Upper floor, ' + (GF + 1) + ' ft above ground floor', note: 'Layout of this floor was not provided; shown as open floor.' }; pickables.push(m); }
    } };
    if (!R.void) { slab(a, b, c, d); }
    else if (R.void === 'all') { /* fully double height */ }
    else {
      const [v0, w0, v1, w1] = R.void;
      slab(a, b, c, w0); slab(a, w1, c, d); slab(a, w0, v0, w1); slab(v1, w0, c, w1);
      const ry = y + 0.5 + 1.75;
      [[[v0, w0], [v1, w0]], [[v1, w0], [v1, w1]], [[v1, w1], [v0, w1]], [[v0, w1], [v0, w0]]].forEach(([p, q]) => {
        seg2(p, q, 0.15, 3.3, y + 0.5, M.glass, G.upper, 'void_railing_glass');
        seg2(p, q, 0.35, 0.25, y + 0.5 + 3.3, M.rail, G.upper, 'void_railing_top');
      });
    }
    if (R.upperName) labels.push({ name: R.upperName, dim: '', upper: true, x: (x0 + x1) / 2 + (R.ulx || 0), y: fl + GF + 5, z: (R.void && R.void !== 'all' ? R.void[1] - 4 : (z0 + z1) / 2) });
  }

  // parapet with cornice and a row of small ornaments, as on the reference photo
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
        const f = i / N, x = p[0] + (q[0] - p[0]) * f + n[0] * 0.5, z = p[1] + (q[1] - p[1]) * f + n[1] * 0.5;
        const orn = box(n[0] ? 0.2 : 0.75, 0.75, n[0] ? 0.75 : 0.2, M.stone, G.roofs, x + n[0] * 0.45, y + 0.9, z + n[1] * 0.45, 'parapet_ornament');
        orn.rotation.set(n[0] ? Math.PI / 4 : 0, 0, n[1] ? Math.PI / 4 : 0); orn.castShadow = false;
      }
    });
  }

  // arched window panel (rectangle with semicircular head), facing +Z before rotation
  function arch(w, h, mat, depth) {
    const s = new THREE.Shape(), r = w / 2;
    s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, h - r); s.absarc(0, h - r, r, 0, Math.PI, false); s.lineTo(-r, 0);
    return new THREE.ExtrudeGeometry(s, { depth: depth || 0.2, bevelEnabled: false, curveSegments: 16 });
  }
  function archOnFace(parent, cx, cy, cz, faceAngle, w, h, frame) {
    // faceAngle: 0 → +Z face, PI/2 → +X face, etc. cy = sill height
    const g1 = arch(w + 0.9, h + 0.45, M.trim, 0.25), g2 = arch(w, h, M.archGlass, 0.3);
    [[g1, M.trim, 0], [g2, M.archGlass, 0.08]].forEach(([g, m, off], i) => {
      if (i === 0 && frame === false) return;
      const mm = new THREE.Mesh(g, m); mm.castShadow = false; mm.receiveShadow = true;
      mm.position.set(cx + Math.sin(faceAngle) * off, cy - (i === 0 ? 0.2 : 0), cz + Math.cos(faceAngle) * off);
      mm.rotation.y = faceAngle; mm.name = 'arched_window'; parent.add(mm);
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

  // ───────── MASJID (two storeys, with gallery round the double-height centre) ─────────
  room({ name: 'Masjid', dim: "53'0\" × 53'0\"", big: true, zone: 'prayer', r: [112, 0, 165, 53], fl: 3, two: true, t: TE, lvl: "+3'0\"", lz: 6, parapet: true,
    void: [125.5, 11, 151.7, 31], upperName: 'Upper gallery', upperDim: "Open to below: 26'2\" × 20'0\"",
    note: 'Prayer hall. The 26\'2" × 20\'0" centre is double height, open to the upper floor.',
    o: [['N', 10, 6, 'tall'], ['N', 22, 9, 'open'], ['N', 38, 6, 'tall'],
      ['W', 6, 6, 'tall'], ['W', 19, 6, 'tall'], ['W', 32, 6, 'tall'], ['W', 41, 4], ['W', 41, 4, 'uwin'],
      ['E', 6, 6, 'tall'], ['E', 19, 6, 'tall'], ['E', 32, 6, 'tall'], ['E', 46, 3],
      ['S', 9, 5, 'gate'], ['S', 24, 5, 'gate'], ['S', 39, 5, 'gate']] });
  room({ id: 'Mihrab', name: 'Mihrab', label: false, floor: true, zone: 'prayer', r: [134, -5, 143, 0.6], fl: 3, h: 18, t: TE, nw: ['S'], o: [['W', 1.5, 2.5, 'tall'], ['E', 1.5, 2.5, 'tall']] });
  box(10.2, 1, 6.6, M.roof, G.roofs, 138.5, 3 + 18 + 0.5, -2.2, 'mihrab_roof');
  room({ name: 'Sound Control Room', dim: "7'0\" × 8'0\"", zone: 'admin', r: [165, 45, 173, 53], fl: 3, two: true, lvl: "+3'0\"", parapet: 'NE', o: [['W', 1, 3], ['N', 2, 4, 'win']] });

  // ───────── SAHAN & ENTRY ─────────
  room({ name: 'Sahan 1', dim: "53'0\" × 38'0\"", big: true, zone: 'sahan', r: [112, 53, 165, 89], fl: 2.5, two: true, t: TE, lvl: "+2'6\"", lz: 6, parapet: 'W',
    void: [135, 65, 148, 75], upperName: 'Upper floor', note: 'Courtyard hall with a double-height opening in the centre.',
    o: [['N', 9, 5, 'gate'], ['N', 24, 5, 'gate'], ['N', 39, 5, 'gate'],
      ['S', 9, 5, 'gate'], ['S', 24, 5, 'gate'], ['S', 39, 5, 'gate'],
      ['W', 4, 5, 'gate'], ['W', 16, 5, 'gate'], ['W', 28, 5, 'gate'], ['W', 4, 5, 'uwin'], ['W', 16, 5, 'uwin'], ['W', 28, 5, 'uwin'], ['E', 2, 3.5], ['E', 23, 3]] });
  room({ name: 'Lobby', zone: 'circ', r: [112, 89, 170, 95], fl: 2.5, two: true, label: false, parapet: 'W',
    o: [['N', 9, 5, 'gate'], ['N', 24, 5, 'gate'], ['N', 39, 5, 'gate'], ['S', 5, 4], ['S', 24, 11, 'open2'], ['S', 50, 4], ['E', 1, 3.5], ['W', 1, 4], ['W', 1, 4, 'uwin']] });
  room({ name: 'Men Shoe & Coat', dim: "15'6\" × 14'3\"", zone: 'circ', r: [115, 95, 131, 110], fl: 2.5, two: true, lvl: "+2'6\"", parapet: 'SW', o: [['N', 2, 4], ['E', 8, 3], ['S', 4, 6, 'win'], ['W', 5, 5, 'win']] });
  room({ name: 'Main Entrance', dim: "21'0\" × 11'7\" (double height)", zone: 'circ', r: [131, 95, 152, 106.6], fl: 2.5, two: true, void: 'all', lvl: "+2'6\"", parapet: 'S',
    o: [['N', 5, 11, 'open2'], ['S', 7.5, 6, 'gate'], ['S', 3, 15, 'uwin'], ['W', 8, 3], ['E', 8, 3]] });
  room({ name: 'Women Shoe & Coat', dim: "15'6\" × 14'3\"", zone: 'circ', r: [152, 95, 168, 110], fl: 2.5, two: true, lvl: "+2'6\"", parapet: 'S', o: [['N', 10, 4], ['W', 8, 3], ['S', 7, 6, 'win']] });
  room({ name: 'Threshold', dim: "21'0\" × 11'1\"", zone: 'circ', r: [131, 106.6, 152, 118], fl: 2, nw: ['N', 'S', 'E', 'W'], roof: false, lvl: "+2'0\"", note: 'Covered entrance porch.' });

  // ───────── SERVICE WING ─────────
  room({ name: 'Sitting Hall', dim: "10'0\" × 22'9\"", zone: 'admin', r: [165, 53, 176, 75], fl: 2.5, two: true, o: [['W', 2, 3.5], ['E', 17, 3]] });
  room({ id: 'WC1', name: 'WC', label: false, zone: 'wet', wc: true, r: [176, 53, 182, 60], fl: 2.5, two: true, parapet: 'N', o: [['S', 2, 2.5]] });
  room({ name: 'VIP Washroom', dim: "9'0\" × 7'4\"", zone: 'wet', wc: true, r: [182, 53, 193, 60], fl: 2.5, two: true, parapet: 'NE', o: [['S', 2, 2.5], ['N', 4, 3, 'uwin']] });
  room({ name: 'VIP Master Room', dim: "14'0\" × 15'0\"", zone: 'admin', r: [176, 60, 193, 75], fl: 2.5, two: true, parapet: 'E', o: [['N', 2, 2.5], ['N', 8, 2.5], ['W', 10, 3], ['E', 5, 5, 'win']] });
  room({ name: 'Men Ablution', dim: "10'0\" × 9'9\"", zone: 'wet', r: [165, 75, 178, 84], fl: 2.5, two: true, o: [['W', 1, 3], ['S', 2, 2.5], ['S', 8, 2.5]] });
  room({ id: 'WC2', name: 'WC', label: false, zone: 'wet', wc: true, r: [165, 84, 171, 89.4], fl: 2.5, two: true, o: [['N', 2, 2.5]] });
  room({ id: 'WC3', name: 'WC', label: false, zone: 'wet', wc: true, r: [171, 84, 178, 89.4], fl: 2.5, two: true, o: [['N', 2, 2.5]] });
  room({ name: 'Women Ablution', dim: "14'0\" × 8'6\"", zone: 'wet', r: [178, 75, 193, 84], fl: 2.5, two: true, parapet: 'E', o: [['S', 1, 3], ['S', 6, 2.5], ['S', 11, 2.5], ['E', 3, 4, 'win']] });
  room({ id: 'WC4', name: 'WC', label: false, zone: 'wet', wc: true, r: [182, 84, 187.5, 89.4], fl: 2.5, two: true, o: [['N', 2, 2.5]] });
  room({ id: 'WC5', name: 'WC', label: false, zone: 'wet', wc: true, r: [187.5, 84, 193, 89.4], fl: 2.5, two: true, parapet: 'E', o: [['N', 2, 2.5]] });
  room({ name: 'Stairs & Lift', dim: "Lift 5'0\" × 10'0\"", zone: 'circ', r: [170, 89.4, 189, 117], fl: 2.5, two: true, lvl: "+2'6\"", lz: 9, parapet: 'SE',
    note: 'Stair (6" riser, 12" tread) and lift to the upper floor.', o: [['W', 1.1, 3.5], ['N', 9, 3], ['S', 7, 5, 'win'], ['E', 8, 6, 'win']] });

  // ───────── DINE AREA (single storey) ─────────
  room({ name: 'Dine Area · Thaal 84', dim: "70'10\" × 69'10\"", big: true, zone: 'dining', r: [38, 43, 112, 111], fl: 3, h: 18, t: TE, lvl: "+3'0\"", parapet: 'N',
    note: 'Men & women dining hall seating 84 thaals.',
    o: [['N', 8, 6, 'win'], ['N', 22, 6, 'win'], ['N', 47, 6, 'win'], ['N', 58, 6, 'win'],
      ['W', 4, 5, 'win'], ['W', 14, 5, 'win'], ['W', 24, 44, 'open'],
      ['E', 14, 5, 'gate'], ['E', 26, 5, 'gate'], ['E', 38, 5, 'gate'], ['E', 2, 4],
      ['S', 2, 26, 'hatch'], ['S', 30.5, 6], ['S', 46, 6, 'win'], ['S', 58, 6, 'win']] });
  room({ id: 'DineExt', name: 'Dine extension', label: false, zone: 'dining', r: [8, 67, 38, 111], fl: 3, h: 18, t: TE, nw: ['E'], parapet: 'NW',
    o: [['W', 7, 6, 'win'], ['W', 18, 6, 'win'], ['W', 30, 5, 'win'], ['N', 8, 6, 'win'], ['N', 19, 6, 'win'], ['S', 2, 5]] });
  box(104, 0.06, 4.6, std(0xa07650), G.floors, 60, 3.08, 108.2, 'service_strip');

  // ───────── MAWAID (new, single storey) ─────────
  const B = { fl: 1, h: 12, roof: false };
  const R2 = (o) => room(Object.assign({}, B, o));
  room({ id: 'MawaidEnv', name: 'Mawaid block', label: false, out: true, layer: 0, zone: 'circ', r: [4, 112, 80, 151], fl: 1, h: 12, roof: false, nw: ['S'],
    o: [['N', 0, 20, 'open'], ['N', 34, 30, 'hatch'], ['N', 66, 4], ['W', 23, 4, 'win'], ['W', 32, 4, 'win'], ['E', 18, 4, 'win'], ['E', 30, 4]] });
  R2({ name: 'Garden', zone: 'garden', r: [4, 112, 24, 129], nw: ['N', 'W', 'E', 'S'] });
  R2({ name: 'Women Ablution (Mawaid)', dim: "10'9\" × 10'4\"", zone: 'wet', r: [24, 112, 38, 124], nw: ['N'], o: [['E', 8, 3], ['W', 2, 3]] });
  R2({ name: 'Service Area', zone: 'service', r: [38, 112, 68, 124], nw: ['N', 'S'], note: 'Service platforms open onto the dine area; thaal racks below.', o: [['W', 8, 3], ['E', 6, 4]] });
  R2({ name: 'Mawaid Entry', zone: 'circ', r: [68, 112, 80, 124], nw: ['N', 'S', 'E'], o: [['W', 6, 4]] });
  R2({ name: 'Dish & Cutlery', dim: "10'2\" × 10'2\"", zone: 'service', r: [24, 124, 36, 134], o: [['E', 6, 3]] });
  R2({ name: 'Grocery Store', dim: "10'2\" × 10'6\"", zone: 'service', r: [24, 140, 36, 151], nw: ['S'], o: [['N', 6, 3]] });
  R2({ name: 'Pot Wash', dim: "11'6\" × 10'6\"", zone: 'service', r: [36, 140, 48.5, 151], nw: ['S'], o: [['N', 3, 6]] });
  R2({ name: 'Thaal Receiving', dim: "7'8\" × 9'8\"", zone: 'service', r: [49, 128, 57, 139.5], o: [['W', 4, 3]] });
  R2({ name: 'Cold Storage', dim: "7'8\" × 9'8\"", zone: 'service', r: [49, 140, 57, 151], nw: ['S'], o: [['N', 2, 3]] });
  R2({ name: 'Kitchen', dim: "13'1\" × 25'8\"", zone: 'service', r: [58, 125, 73, 151], nw: ['S'], o: [['W', 3, 4], ['E', 20, 4], ['N', 3, 4]] });
  R2({ name: 'Aamil Office', dim: "15'6\" × 20'0\"", zone: 'admin', r: [4, 129, 20, 151], nw: ['W'], o: [['N', 1, 3], ['E', 17, 3]] });
  labels.push({ name: 'Mawaid', dim: 'Kitchen & service', big: true, x: 46, y: 14, z: 132 });
  box(57.6, 1, 17.6, M.roof, G.roofs, 52.5, 1 + 12 + 0.5, 120.5, 'mawaid_roof_a');
  box(78, 1, 22.6, M.roof, G.roofs, 42, 1 + 12 + 0.5, 140.5, 'mawaid_roof_b');
  parapet(3, 112, 81, 151, 1 + 12 + 1, 'W');

  // ───────── EXISTING BUILDING → MADRESSAH ─────────
  // Measured from aerial imagery: about 60 ft × 87 ft. The sheet's Madressah rooms are fitted inside it.
  const EX = [20, 151, 80, 238], sx = 60 / 76, sz = 87 / 76;
  const mx = x => 80 - (80 - x) * sx, mz = z => 151 + (z - 151) * sz;
  const MR = (o) => {
    const [a, b, c, d] = o.r, q = Object.assign({}, B, o, { r: [mx(a), mz(b), mx(c), mz(d)] });
    q.o = (o.o || []).map(([sd, at, w, k]) => [sd, at * (sd === 'N' || sd === 'S' ? sx : sz), w, k]);
    room(q);
  };
  room({ id: 'ExistingEnv', name: 'Existing building', label: false, out: true, old: true, layer: 0, zone: 'circ', r: EX, fl: 1, h: 11, roof: false,
    o: [['N', 2, 5], ['N', 51, 9], ['S', 5, 5, 'win'], ['S', 15, 5, 'win'], ['S', 25, 5, 'win'], ['S', 35, 5, 'win'], ['S', 45, 5, 'win'],
      ['W', 8, 4, 'win'], ['W', 20, 4, 'win'], ['W', 32, 4, 'win'], ['W', 46, 5, 'win'], ['W', 66, 5, 'win'],
      ['E', 6, 5], ['E', 18, 4, 'win'], ['E', 36, 5], ['E', 50, 4, 'win'], ['E', 58, 5], ['E', 72, 4, 'win']] });
  labels.push({ name: 'Existing building', dim: 'Future Madressah · ≈60′ × 87′', big: true, x: 50, y: 16, z: 205 });
  MR({ name: 'Pantry', zone: 'service', r: [4, 151, 22, 156], label: false, nw: ['W'], floor: false });
  MR({ name: 'Meeting Room', dim: "15'6\" × 10'6\"", zone: 'admin', r: [4, 159, 22, 170], nw: ['W'], o: [['E', 3, 3]] });
  MR({ id: 'U1', name: 'Umoor Office', dim: "pair, 15'6\" × 9'0\"", zone: 'admin', r: [4, 170, 13, 179], nw: ['W'], label: false, o: [['E', 3, 2.5]] });
  MR({ id: 'U2', name: 'Umoor Office', dim: "pair, 15'6\" × 9'0\"", zone: 'admin', r: [13, 170, 22, 179], label: false, o: [['E', 3, 3]] });
  MR({ id: 'U3', name: 'Umoor Office', dim: "pair, 15'6\" × 9'0\"", zone: 'admin', r: [4, 179, 13, 188], nw: ['W'], label: false, o: [['E', 3, 2.5]] });
  MR({ id: 'U4', name: 'Umoor Office', dim: "pair, 15'6\" × 9'0\"", zone: 'admin', r: [13, 179, 22, 188], label: false, o: [['E', 3, 3]] });
  MR({ id: 'U5', name: 'Umoor Office', dim: "8'6\" × 11'4\"", zone: 'admin', r: [27, 159, 36, 170], label: false, o: [['W', 6, 3]] });
  MR({ id: 'U6', name: 'Umoor Office', dim: "8'6\" × 11'4\"", zone: 'admin', r: [36, 159, 45, 170], label: false, o: [['N', 4, 3]] });
  MR({ id: 'U7', name: 'Umoor Office', dim: "17'6\" × 19'6\"", zone: 'admin', r: [27, 170, 45, 189], o: [['W', 3, 3]] });
  MR({ name: 'Washroom', zone: 'wet', r: [48, 159, 70, 187], o: [['N', 2, 4], ['S', 2, 4]] });
  const row1 = [[4, 16.5], [16.5, 29], [29, 41.5], [41.5, 54], [59, 70]];
  row1.forEach(([a, b], i) => MR({ id: 'C1' + i, name: 'Classroom', zone: 'edu', r: [a, 190, b, 205], nw: i === 0 ? ['W'] : [], label: i === 4, o: [['S', (b - a) / 2 - 1.5, 3]] }));
  const xs = [4, 16.67, 29.33, 42, 54.67, 67.33, 80];
  for (let i = 0; i < 6; i++) MR({ id: 'C2' + i, name: 'Classroom', zone: 'edu', r: [xs[i], 210, xs[i + 1], 227], nw: ['S'].concat(i === 0 ? ['W'] : []).concat(i === 5 ? ['E'] : []), label: false, o: [['N', 5, 3]] });
  // hip roof + front canopy (as seen in the aerial)
  hipRoof(EX[0] - 1, EX[1] - 1, EX[2] + 1, EX[3] + 1, 1 + 11 + 0.2, 9, 1.5, M.shingle, G.roofs);
  if (!opt.cut) {
    box(5, 0.6, 72, M.trim, G.roofs, 84, 1 + 9.3, 196, 'existing_canopy');
    [162, 184, 208, 230].forEach(z => mesh(new THREE.CylinderGeometry(0.35, 0.35, 9, 10), M.trim, G.walls, 86, 1 + 4.5, z, 'canopy_post'));
  }

  // ───────── DOME — tower, arched lantern, dome, gold finial (after the reference photo) ─────────
  const mcx = 138.6, mcz = 21, mTop = 3 + TWO + 1;
  if (!opt.cut) {
    const tw = 26, tH = 9, tg = G.dome;
    box(tw, tH, tw, M.wall, tg, mcx, mTop + tH / 2, mcz, 'dome_tower');
    for (let f = 0; f < 4; f++) {
      const ang = f * Math.PI / 2, nx = Math.sin(ang), nz = Math.cos(ang);
      archOnFace(tg, mcx + nx * (tw / 2 + 0.02), mTop + 1.5, mcz + nz * (tw / 2 + 0.02), ang, 3.6, 6.2);
    }
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
    // slightly elongated dome with a soft swell, ending in a point for the finial
    const prof = [[0, 0], [7.6, 0], [7.85, 1.2], [7.85, 2.6], [7.6, 4.2], [7.0, 6.0], [6.0, 7.9], [4.7, 9.6], [3.2, 11.0], [1.8, 12.0], [0.7, 12.6], [0, 12.8]].map(p => new THREE.Vector2(p[0], p[1]));
    mesh(new THREE.LatheGeometry(prof, 64), M.dome, tg, mcx, y, mcz, 'dome');
    y += 12.6;
    const fin = [[0, 0], [0.9, 0], [0.9, 0.3], [0.45, 0.55], [0.8, 0.9], [0.95, 1.3], [0.8, 1.7], [0.3, 2.0], [0.55, 2.3], [0.6, 2.55], [0.3, 2.8], [0.42, 3.0], [0.42, 3.2], [0.2, 3.4], [0.12, 4.6], [0, 6.2]].map(p => new THREE.Vector2(p[0], p[1]));
    mesh(new THREE.LatheGeometry(fin, 24), M.gold, tg, mcx, y, mcz, 'finial');
  }

  // entrance porch: columns and canopy
  [[131.8, 107.4], [151.2, 107.4], [131.8, 117.2], [151.2, 117.2]].forEach(([x, z]) => {
    const ch = opt.cut ? opt.cut : 14; mesh(new THREE.CylinderGeometry(0.85, 0.95, ch, 20), M.stone, G.walls, x, 2 + ch / 2, z, 'porch_column');
  });
  if (!opt.cut) {
    box(22.5, 1.4, 12.4, M.trim, G.roofs, 141.5, 16.7, 112.3, 'porch_canopy');
    box(23.5, 0.5, 13.4, M.trim, G.roofs, 141.5, 17.6, 112.3, 'porch_coping');
  }
  for (let i = 0; i < 4; i++) box(21, 0.5, 1.2, M.pave, G.site, 141.5, 0.25 + (3 - i) * 0.5, 118.6 + i * 1.2, 'step');

  // ───────── STAIRS & LIFT ─────────
  for (let i = 0; i < 15; i++) {
    box(5, 0.5, 1, M.pave, G.furniture, 173.5, 2.5 + (i + 1) * 0.5 - 0.25, 112.5 - i, 'stair');
    box(5, 0.5, 1, M.pave, G.furniture, 185.5, 2.5 + 7.5 + (i + 1) * 0.5 - 0.25, 98 + i, 'stair');
  }
  box(17, 0.5, 4.5, M.pave, G.furniture, 179.5, 2.5 + 7.5 - 0.25, 95.2, 'landing');
  const shaftH = opt.cut ? opt.cut : TWO + 3;
  box(5.4, shaftH, 10, M.dark, G.walls, 179.5, 2.5 + shaftH / 2, 106, 'lift_shaft');

  // ───────── FURNITURE ─────────
  if (opt.furniture) {
    for (let z = 5; z <= 50; z += 4) box(51, 0.04, 0.25, M.saff, G.furniture, 138.5, 3 + 0.1, z, 'saff_line');
    for (let i = 0; i < 4; i++) box(3, 1 + i, 1.2, M.wood, G.furniture, 146.5, 3 + 0.5 + i * 0.5, 1.6 + i * 1.2, 'minbar');
    const thGeo = new THREE.CylinderGeometry(2.4, 2.4, 0.25, 24), standGeo = new THREE.CylinderGeometry(0.9, 1.1, 0.9, 12);
    for (let r = 0; r < 7; r++) for (let c = 0; c < 12; c++) {
      const x = 43.5 + c * 5.95, z = 48.5 + r * 8.4;
      mesh(standGeo, M.wood, G.furniture, x, 3.5, z, 'thaal_stand'); mesh(thGeo, M.brass, G.furniture, x, 4.05, z, 'thaal');
    }
    [[42, 117.5, 5, 4], [42, 129, 5, 9]].forEach(([x, z, w, d]) => box(w, 6, d, M.steel, G.furniture, x, 4, z, 'thaal_rack'));
    box(26, 3, 2.2, M.steel, G.furniture, 53, 2.5, 113.6, 'service_platform');
    box(2.4, 3, 20, M.steel, G.furniture, 70.8, 2.5, 138, 'kitchen_counter');
    box(3, 3, 9, M.steel, G.furniture, 64.5, 2.5, 138, 'kitchen_island');
    [166, 173, 180].forEach(z => box(mx(70) - mx(62), 7, 0.3, M.dark, G.furniture, (mx(62) + mx(70)) / 2, 4.5, mz(z), 'stall'));
    [162.5, 169.5, 176.5, 183.5].forEach(z => toilet(mx(68.2), 1, mz(z)));
    const desk = (x, z) => box(3.4, 2.5, 1.8, M.wood, G.furniture, mx(x), 2.25, mz(z), 'desk');
    row1.forEach(([a, b]) => { for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++) desk(a + (b - a) * (0.3 + 0.4 * k), 194 + j * 5); });
    for (let i = 0; i < 6; i++) for (let k = 0; k < 2; k++) for (let j = 0; j < 3; j++) desk(xs[i] + (xs[i + 1] - xs[i]) * (0.3 + 0.4 * k), 214 + j * 4.2);
    box(8, 2.6, 3, M.wood, G.furniture, 12, 2.3, 137, 'desk');
    box(7, 2.5, 4, M.wood, G.furniture, mx(13), 2.25, mz(164.5), 'meeting_table');
    mesh(new THREE.CylinderGeometry(2.6, 2.8, 1.2, 24), M.pave, G.furniture, 15, 1.6, 118, 'fountain');
    mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.2, 24), M.water, G.furniture, 15, 2.15, 118, 'fountain_water');
    [[8, 116], [9, 125], [20, 125], [21, 115]].forEach(([x, z]) => {
      mesh(new THREE.CylinderGeometry(0.35, 0.45, 5, 8), M.trunk, G.furniture, x, 3.5, z, 'tree');
      mesh(new THREE.SphereGeometry(2.6, 12, 10), M.leaf, G.furniture, x, 7.2, z, 'tree');
    });
  }

  // ───────── SITE — traced from aerial imagery of 3812 Barney Rd ─────────
  // U = pixel coords on the traced aerial (3× upscale, 0.1407 m/px). Converted to drawing feet.
  const K = 0.3048 / 0.4222, C0 = 394.2, C1 = 112.1, A0 = 50, A1 = 194.5, UX = [0.35837, 0.93358], UZ = [-0.93358, 0.35837];
  const U = (u, v) => { const ox = (u / 3 + 175 - C0) / K, oy = (v / 3 - C1) / K; return [A0 + ox * UX[0] + oy * UX[1], A1 + ox * UZ[0] + oy * UZ[1]]; };
  const UL = a => a.map(p => U(p[0], p[1]));
  const SITE = new THREE.Group(); SITE.name = 'site_works'; G.site.add(SITE);
  // ground: grass lawn + woodland floor
  const ground = box(2600, 0.4, 2600, M.grass, G.site, 100, -0.2, 120, 'ground'); ground.castShadow = false;
  const clearingU = [[380, 430], [390, 330], [470, 280], [520, 250], [600, 200], [700, 150], [800, 100], [900, 75], [1000, 70], [1100, 100], [1200, 170], [1300, 240], [1345, 300],
    [1040, 740], [945, 880], [905, 960], [860, 1060], [760, 1060], [640, 985], [520, 925], [400, 860], [300, 760], [230, 700], [215, 600], [290, 560], [370, 520]];
  flat(UL(clearingU), 0.02, M.lawn, SITE, 'lawn').receiveShadow = true;
  // road (Barney Rd) and yard beyond
  const rc0 = U(735, 1350), rc1 = U(1340, 300), rdx = rc1[0] - rc0[0], rdz = rc1[1] - rc0[1], rl = Math.hypot(rdx, rdz), rd = [rdx / rl, rdz / rl], rn = [-rd[1], rd[0]];
  const ext = (p, s) => [p[0] + rd[0] * s, p[1] + rd[1] * s];
  const r0 = ext(rc0, -500), r1 = ext(rc1, 500);
  seg2(r0, r1, 30, 0.12, 0, M.road, SITE, 'barney_rd');
  for (let s = 0; s < rl + 1000; s += 20) seg2(ext(r0, s), ext(r0, s + 10), 0.5, 0.02, 0.12, M.yellow, SITE, 'centre_line');
  // side of the road facing the site: find which normal points toward the building
  const toB = [100 - rc0[0], 100 - rc0[1]], sideSign = (toB[0] * rn[0] + toB[1] * rn[1]) > 0 ? 1 : -1, nS = [rn[0] * sideSign, rn[1] * sideSign];
  const off = (p, d) => [p[0] + nS[0] * d, p[1] + nS[1] * d];
  seg2(off(r0, 17.5), off(r1, 17.5), 1.2, 0.5, 0, M.curb, SITE, 'curb');
  seg2(off(r0, 22), off(r1, 22), 5, 0.3, 0, M.pave, SITE, 'sidewalk');
  seg2(off(r0, -17.5), off(r1, -17.5), 1.2, 0.5, 0, M.curb, SITE, 'curb');
  const yd = [off(r0, -19), off(r1, -19), off(r1, -400), off(r0, -400)];
  flat(yd, 0.04, M.gravel, SITE, 'neighbouring_yard');
  { const lp = ext(rc0, rl * 0.78); labels.push({ name: 'Barney Rd', dim: '', site: true, x: lp[0], y: 3, z: lp[1] }); }
  // parking lot
  const lotU = [[385, 520], [400, 455], [425, 425], [520, 422], [605, 458], [690, 500], [705, 600], [700, 640], [780, 660], [905, 745], [915, 795], [895, 820], [860, 850], [835, 895], [810, 880], [415, 630], [410, 585], [380, 560]];
  flat(UL(lotU), 0.1, M.asphalt, SITE, 'parking_lot');
  const cc = U(748, 545), crad = 88 / 3 / K;
  mesh(new THREE.CylinderGeometry(crad, crad, 0.1, 48), M.asphalt, SITE, cc[0], 0.08, cc[1], 'drop_off_circle').castShadow = false;
  flat(UL([[810, 505], [860, 545], [870, 585], [830, 620], [790, 600]]), 0.09, M.asphalt, SITE, 'accessible_bays');
  flat(UL([[745, 465], [760, 425], [795, 428], [790, 470]]), 0.09, M.asphalt, SITE, 'drop_off_lane');
  const driveU = [[850, 860], [900, 815], [962, 862], [922, 908], [880, 902]];
  flat(UL(driveU), 0.11, M.asphalt, SITE, 'entrance_drive');
  // curbs around the lot
  const lotL = UL(lotU);
  lotL.forEach((p, i) => { const q = lotL[(i + 1) % lotL.length]; if (i === 11 || i === 12) return; seg2(p, q, 1.2, 0.5, 0, M.curb, SITE, 'lot_curb'); });
  // islands
  const island = (pts, nm) => { flat(UL(pts), 0.0, M.curb, SITE, nm + '_curb', 0.55); flat(UL(pts).map(p => p), 0.56, M.lawn, SITE, nm); };
  island([[468, 522], [482, 508], [678, 590], [664, 618]], 'island_bar');
  island([[497, 478], [527, 484], [500, 535], [470, 528]], 'island_stem');
  island([[715, 640], [745, 615], [770, 632], [740, 660]], 'island_small');
  island([[628, 625], [650, 628], [648, 662], [626, 658]], 'island_end');
  mesh(new THREE.CylinderGeometry(17 / 3 / K, 17 / 3 / K, 0.6, 32), M.curb, SITE, cc[0], 0.3, cc[1], 'circle_island');
  mesh(new THREE.CylinderGeometry(15 / 3 / K, 15 / 3 / K, 0.1, 32), M.lawn, SITE, cc[0], 0.62, cc[1], 'circle_lawn');
  if (opt.trees) { mesh(new THREE.CylinderGeometry(0.3, 0.4, 5, 8), M.trunk, SITE, cc[0], 3, cc[1]); mesh(new THREE.IcosahedronGeometry(3.2, 1), M.leaf, SITE, cc[0], 7.5, cc[1], 'circle_tree'); }
  // parking stalls: stripes perpendicular to row lines
  const stalls = (pu, qu, hintU, n) => {
    const p = U(pu[0], pu[1]), q = U(qu[0], qu[1]), hnt = U(hintU[0], hintU[1]);
    const dx = q[0] - p[0], dz = q[1] - p[1], L = Math.hypot(dx, dz), d = [dx / L, dz / L];
    let nn = [-d[1], d[0]]; if ((hnt[0] - p[0]) * nn[0] + (hnt[1] - p[1]) * nn[1] < 0) nn = [-nn[0], -nn[1]];
    const cnt = n || Math.floor(L / 9);
    for (let i = 0; i <= cnt; i++) { const a = [p[0] + d[0] * i * 9 + nn[0] * 1.5, p[1] + d[1] * i * 9 + nn[1] * 1.5]; seg2(a, [a[0] + nn[0] * 17, a[1] + nn[1] * 17], 0.45, 0.03, 0.12, M.stripe, SITE, 'stall_line'); }
  };
  stalls([432, 628], [805, 872], [600, 600]);
  stalls([482, 545], [662, 622], [520, 640]);
  stalls([490, 506], [676, 585], [600, 470]);
  stalls([440, 430], [600, 463], [520, 500]);
  stalls([790, 668], [898, 744], [780, 720]);
  labels.push({ name: 'Parking', dim: '', site: true, x: U(560, 600)[0], y: 3, z: U(560, 600)[1] });
  // concrete walks & pads
  flat(UL([[500, 365], [555, 365], [555, 410], [500, 410]]), 0.06, M.pave, SITE, 'pad');
  flat(UL([[600, 445], [790, 360], [800, 390], [610, 470]]), 0.06, M.pave, SITE, 'front_walk');
  flat(UL([[690, 430], [800, 390], [810, 440], [720, 470]]), 0.07, M.pave, SITE, 'entry_plaza');
  flat(UL([[510, 810], [590, 830], [580, 875], [505, 860]]), 0.05, M.sand, SITE, 'play_area');
  const fw = (a, b) => seg2(U(a[0], a[1]), U(b[0], b[1]), 5, 0.12, 0, M.pave, SITE, 'sidewalk');
  fw([915, 798], [960, 815]); fw([960, 815], [1045, 760]);
  // walkway from the drop-off to the new main entrance porch
  seg2([141.5, 124], U(830, 560), 10, 0.14, 0, M.pave, SITE, 'entrance_walk');

  // ───────── MAIN GATE at the entrance drive ─────────
  {
    const a = U(880, 900), b = U(905, 812), mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const ddx = b[0] - a[0], ddz = b[1] - a[1], L = Math.hypot(ddx, ddz), d = [ddx / L, ddz / L];
    const span = 30, pA = [mid[0] - d[0] * (span / 2 + 1.6), mid[1] - d[1] * (span / 2 + 1.6)], pB = [mid[0] + d[0] * (span / 2 + 1.6), mid[1] + d[1] * (span / 2 + 1.6)];
    const gG = new THREE.Group(); gG.name = 'main_gate'; SITE.add(gG);
    [pA, pB].forEach(p => {
      box(3, 9, 3, M.stone, gG, p[0], 4.5, p[1], 'gate_pillar');
      box(3.8, 0.6, 3.8, M.trim, gG, p[0], 9.3, p[1], 'gate_pillar_cap');
      mesh(new THREE.LatheGeometry([[0, 0], [1.3, 0], [1.35, 0.5], [1.2, 1.1], [0.8, 1.7], [0.35, 2.1], [0, 2.25]].map(q => new THREE.Vector2(q[0], q[1])), 24), M.dome, gG, p[0], 9.6, p[1], 'gate_pillar_dome');
      mesh(new THREE.LatheGeometry([[0, 0], [0.2, 0], [0.25, 0.3], [0.1, 0.5], [0.05, 1.2], [0, 1.4]].map(q => new THREE.Vector2(q[0], q[1])), 12), M.gold, gG, p[0], 11.8, p[1], 'gate_finial');
    });
    // two leaves, swung open toward the lot
    const inward = (() => { const n = [-d[1], d[0]], lotC = U(700, 700); return ((lotC[0] - mid[0]) * n[0] + (lotC[1] - mid[1]) * n[1]) > 0 ? n : [-n[0], -n[1]]; })();
    [[pA, 1], [pB, -1]].forEach(([p, s]) => {
      const hinge = [p[0] + d[0] * 1.6 * s, p[1] + d[1] * 1.6 * s], leaf = new THREE.Group(); leaf.name = 'gate_leaf';
      leaf.position.set(hinge[0], 0, hinge[1]); gG.add(leaf);
      const W = span / 2 - 0.2;
      [0.6, 6.4].forEach(y => { const r = box(W, 0.3, 0.3, M.iron, leaf, W / 2, y, 0, 'gate_rail'); });
      for (let i = 0; i <= 14; i++) box(0.12, 6.3, 0.12, M.iron, leaf, (i / 14) * W, 3.5, 0, 'gate_bar');
      for (let i = 0; i < 14; i += 2) box(0.1, 0.5, 0.1, M.gold, leaf, (i / 14) * W + W / 28, 6.9, 0, 'gate_spear');
      const base = Math.atan2(d[1] * s, d[0] * s), open = Math.atan2(inward[1], inward[0]);
      let df = open - base; while (df > Math.PI) df -= 2 * Math.PI; while (df < -Math.PI) df += 2 * Math.PI;
      leaf.rotation.y = -(base + df * 0.78);
    });
    labels.push({ name: 'Main gate', dim: 'Entrance from Barney Rd', site: true, x: mid[0], y: 14, z: mid[1] });
  }

  // ───────── WOODS — trees everywhere outside the cleared area, west of the road ─────────
  if (opt.trees) {
    const inPoly = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (((yi > p[1]) !== (yj > p[1])) && (p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi)) c = !c; } return c; };
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const tr = [], c1 = [], c2 = [];
    for (let v = -500; v <= 1900; v += 48) for (let u = -600; u <= 1700; u += 48) {
      const pu = u + (rnd() - 0.5) * 40, pv = v + (rnd() - 0.5) * 40;
      const roadU = 735 + (1350 - pv) / 1050 * 605;
      if (pu > roadU - 70) continue;
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
    // a few trees along the lawn edge by the road
    [[1080, 640], [1150, 520], [1210, 420], [1000, 760]].forEach(([u, v]) => { const p = U(u, v); mesh(new THREE.CylinderGeometry(0.5, 0.7, 7, 8), M.trunk, G.trees, p[0], 3.5, p[1]); mesh(new THREE.IcosahedronGeometry(4.5, 1), M.leaf, G.trees, p[0], 9.5, p[1], 'street_tree'); });
  }

  // true north in drawing coordinates (from the aerial alignment)
  const north = new THREE.Vector3(-UX[1] * 1, 0, -UZ[1] * 1).normalize();
  return { root, groups: G, labels, pickables, zones: ZONES, center: new THREE.Vector3(98.5, 0, 111), north, siteU: U };
}
if (typeof module !== 'undefined') module.exports = { buildMasjid };
