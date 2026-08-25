/* ══════════════════════════════════════════════════════════
   Tetris — 문제 풀이와 연동되는 "AI 자동 플레이" 테트리스
   ───────────────────────────────────────────────────────────
   핵심 규칙 (일반 테트리스와 다름!)
   · AI가 **혼자 계속** 블록을 최적 위치에 쌓는다.
   · 줄이 꽉 차도 **자동으로 터지지 않는다** → 반짝이며 "대기(pending)" 상태로 남는다.
   · **문제를 맞히면** 대기 중인 줄이 한꺼번에 터진다. (정답 = 소거 버튼)
   · 오답 → 쓰레기 줄 1개 상승 (압박)
   · 판이 가득 차기 전에 맞혀야 한다는 긴장감 + 터질 때의 쾌감
   ══════════════════════════════════════════════════════════ */
const Tetris = (() => {
  const COLS = 10, ROWS = 18;

  /* 테트로미노 (회전 상태 배열) */
  const SHAPES = {
    I:{ c:'#3ad1e0', r:[[[0,1],[1,1],[2,1],[3,1]], [[2,0],[2,1],[2,2],[2,3]]] },
    O:{ c:'#f4d03f', r:[[[1,0],[2,0],[1,1],[2,1]]] },
    T:{ c:'#b06fdb', r:[[[1,0],[0,1],[1,1],[2,1]], [[1,0],[1,1],[2,1],[1,2]],
                        [[0,1],[1,1],[2,1],[1,2]], [[1,0],[0,1],[1,1],[1,2]]] },
    S:{ c:'#4fd07a', r:[[[1,0],[2,0],[0,1],[1,1]], [[1,0],[1,1],[2,1],[2,2]]] },
    Z:{ c:'#f2596b', r:[[[0,0],[1,0],[1,1],[2,1]], [[2,0],[1,1],[2,1],[1,2]]] },
    J:{ c:'#4d7fe0', r:[[[0,0],[0,1],[1,1],[2,1]], [[1,0],[2,0],[1,1],[1,2]],
                        [[0,1],[1,1],[2,1],[2,2]], [[1,0],[1,1],[0,2],[1,2]]] },
    L:{ c:'#f0913a', r:[[[2,0],[0,1],[1,1],[2,1]], [[1,0],[1,1],[1,2],[2,2]],
                        [[0,1],[1,1],[2,1],[0,2]], [[0,0],[1,0],[1,1],[1,2]]] }
  };
  const KEYS = Object.keys(SHAPES);

  let cvs, ctx, cell = 18, grid = [], raf = null;
  let piece = null;            // 낙하 중인 조각
  let shakeT = 0, flashRows = [], flashT = 0, sparks = [];
  let lines = 0, drops = 0;
  let onLine = null;           // 라인 소거 콜백
  let onPending = null;        // 대기 줄 수 변화 콜백
  let onDanger = null;         // 위험(가득 참) 콜백
  let running = false;
  let autoT = null;            // AI 자동 낙하 타이머
  let dropMs = 1500;           // 자동 낙하 간격
  let pulse = 0;               // 대기 줄 반짝임 위상
  let lastPending = 0;

  function emptyGrid(){
    return Array.from({length:ROWS}, () => Array(COLS).fill(null));
  }

  /* ── 초기화 ─────────────────────────────────────────── */
  function init(canvas, opts = {}){
    cvs = canvas; ctx = cvs.getContext('2d');
    onLine    = opts.onLine    || null;
    onPending = opts.onPending || null;
    onDanger  = opts.onDanger  || null;
    dropMs    = opts.dropMs    || 1500;
    grid = emptyGrid(); piece = null; lines = 0; drops = 0;
    sparks = []; flashRows = []; shakeT = 0; lastPending = 0;
    resize();
    running = true;
    if(!raf) loop();
    startAuto();
  }
  function startAuto(){
    stopAuto();
    autoT = setInterval(() => { if(running && !piece) spawn(); }, dropMs);
  }
  function stopAuto(){ if(autoT){ clearInterval(autoT); autoT = null; } }
  function stop(){
    running = false; stopAuto();
    if(raf){ cancelAnimationFrame(raf); raf = null; }
  }
  function setSpeed(ms){ dropMs = ms; if(running) startAuto(); }
  /* 해설을 읽는 동안 판이 자라지 않도록 일시정지 */
  function pause(){ stopAuto(); }
  function resume(){ if(running) startAuto(); }

  function resize(){
    if(!cvs) return;
    const w = cvs.clientWidth || 200;
    cell = Math.max(10, Math.floor(w / COLS));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cvs.width  = COLS * cell * dpr;
    cvs.height = ROWS * cell * dpr;
    cvs.style.height = (ROWS * cell) + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ── 충돌 검사 ──────────────────────────────────────── */
  function collide(cells, ox, oy, g = grid){
    for(const [x, y] of cells){
      const gx = x + ox, gy = y + oy;
      if(gx < 0 || gx >= COLS || gy >= ROWS) return true;
      if(gy >= 0 && g[gy][gx]) return true;
    }
    return false;
  }
  function landingY(cells, ox){
    let y = -2;
    while(!collide(cells, ox, y + 1)) y++;
    return y;
  }

  /* ── AI: 최적 배치 탐색 (고전 휴리스틱) ─────────────── */
  function evaluate(g){
    const heights = Array(COLS).fill(0);
    let holes = 0;
    for(let x = 0; x < COLS; x++){
      let seen = false;
      for(let y = 0; y < ROWS; y++){
        if(g[y][x]){ if(!seen){ heights[x] = ROWS - y; seen = true; } }
        else if(seen) holes++;
      }
    }
    const agg = heights.reduce((a, b) => a + b, 0);
    let bump = 0;
    for(let x = 0; x < COLS - 1; x++) bump += Math.abs(heights[x] - heights[x+1]);
    let full = 0;
    for(let y = 0; y < ROWS; y++) if(g[y].every(c => c)) full++;
    return -0.510066 * agg + 0.760666 * full - 0.35663 * holes - 0.184483 * bump;
  }
  function bestPlacement(type){
    const rots = SHAPES[type].r;
    let best = null;
    for(let r = 0; r < rots.length; r++){
      const cells = rots[r];
      const minX = Math.min(...cells.map(c => c[0]));
      const maxX = Math.max(...cells.map(c => c[0]));
      for(let ox = -minX; ox + maxX < COLS; ox++){
        const y = landingY(cells, ox);
        if(y < -1) continue;
        // 가상 배치 후 평가
        const g = grid.map(r => r.slice());
        let ok = true;
        for(const [cx, cy] of cells){
          const gy = cy + y, gx = cx + ox;
          if(gy < 0){ ok = false; break; }
          g[gy][gx] = SHAPES[type].c;
        }
        if(!ok) continue;
        const score = evaluate(g);
        if(!best || score > best.score) best = { r, ox, y, score };
      }
    }
    return best;
  }

  /* ── 블록 투하 (보너스로 즉시 몇 개 더 떨어뜨릴 때) ── */
  function drop(count = 1){
    if(!running) return;
    for(let i = 0; i < count; i++) setTimeout(() => spawn(), i * 300);
  }
  function spawn(){
    if(!running || piece) { setTimeout(spawn, 120); return; }
    const type = KEYS[(Math.random() * KEYS.length) | 0];
    const plan = bestPlacement(type);
    if(!plan){ topOut(); return; }
    piece = {
      type, color: SHAPES[type].c,
      cells: SHAPES[type].r[plan.r],
      x: plan.ox, y: -2, targetY: plan.y,
      vy: 0
    };
    drops++;
  }

  /* ── 조각 고정 ──────────────────────────────────────
     ※ 여기서 줄을 지우지 않는다! 꽉 찬 줄은 "대기" 상태로 남는다. */
  function lock(){
    if(!piece) return;
    for(const [cx, cy] of piece.cells){
      const gy = cy + piece.y, gx = cx + piece.x;
      if(gy < 0){ piece = null; topOut(); return; }
      grid[gy][gx] = piece.color;
    }
    piece = null;
    notifyPending();
    checkDanger();
  }

  /* 꽉 차서 소거를 기다리는 줄 목록 */
  function pendingRows(){
    const rows = [];
    for(let y = 0; y < ROWS; y++) if(grid[y].every(c => c)) rows.push(y);
    return rows;
  }
  function notifyPending(){
    const n = pendingRows().length;
    if(n !== lastPending){ lastPending = n; if(onPending) onPending(n); }
  }

  /* ── 정답! 대기 중인 줄을 한꺼번에 터뜨린다 ─────────── */
  function detonate(){
    if(!running) return 0;
    const full = pendingRows();
    if(!full.length) return 0;

    flashRows = full.slice(); flashT = 1;
    shakeT = Math.min(1, 0.45 + full.length * 0.2);

    for(const y of full){
      for(let x = 0; x < COLS; x++){
        sparks.push({
          x: x * cell + cell/2, y: y * cell + cell/2,
          vx:(Math.random()-.5)*5.2, vy:-Math.random()*5-1.4,
          life:1, c: grid[y][x] || '#fff', s: 2 + Math.random()*3.4
        });
      }
    }
    setTimeout(() => {
      for(const y of full){ grid.splice(y, 1); grid.unshift(Array(COLS).fill(null)); }
      flashRows = [];
      notifyPending();
    }, 180);

    lines += full.length;
    if(onLine) onLine(full.length, lines);
    return full.length;
  }

  /* 위험 경고: 스택이 상단 3줄에 닿으면 */
  function checkDanger(){
    for(let y = 0; y < 3; y++)
      if(grid[y].some(c => c)){ if(onDanger) onDanger(true); return; }
    if(onDanger) onDanger(false);
  }
  function stackHeight(){
    for(let y = 0; y < ROWS; y++) if(grid[y].some(c => c)) return ROWS - y;
    return 0;
  }

  /* ── 오답: 쓰레기 줄 상승 ───────────────────────────── */
  function garbage(n = 1){
    if(!running) return;
    for(let i = 0; i < n; i++){
      grid.shift();
      const hole = (Math.random() * COLS) | 0;
      const row = Array.from({length:COLS}, (_, x) => x === hole ? null : '#7d8676');
      grid.push(row);
    }
    shakeT = 0.5;
    notifyPending(); checkDanger();
  }

  /* ── 콤보 폭탄: 바닥 2줄의 빈칸을 메워 즉시 소거 ────── */
  function bomb(){
    if(!running) return 0;
    for(let y = ROWS - 2; y < ROWS; y++)
      for(let x = 0; x < COLS; x++)
        if(!grid[y][x]) grid[y][x] = '#f2c200';
    shakeT = 0.7;
    return detonate();
  }

  function topOut(){
    // 넘치면 하단 6줄만 남기고 정리 (게임 오버 대신 압축 — 학습 흐름 유지)
    const keep = grid.slice(ROWS - 6).map(r => r.slice());
    grid = emptyGrid();
    for(let i = 0; i < 6; i++) grid[ROWS - 6 + i] = keep[i];
    shakeT = 0.9;
    notifyPending();
    if(onDanger) onDanger('overflow');
  }

  /* ── 렌더 루프 ──────────────────────────────────────── */
  function loop(){
    raf = requestAnimationFrame(loop);
    if(!running || !ctx) return;
    update();
    render();
  }
  function update(){
    if(piece){
      piece.vy = Math.min(piece.vy + 0.085, 1.35);
      piece.y += piece.vy;
      if(piece.y >= piece.targetY){ piece.y = piece.targetY; lock(); }
    }
    pulse += 0.09;
    if(shakeT > 0) shakeT = Math.max(0, shakeT - 0.06);
    if(flashT > 0) flashT = Math.max(0, flashT - 0.09);
    for(const s of sparks){
      s.x += s.vx; s.y += s.vy; s.vy += 0.28; s.life -= 0.026;
    }
    sparks = sparks.filter(s => s.life > 0);
  }

  function roundRect(x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x+r, y); ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r); ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r); ctx.closePath();
  }
  function block(x, y, color){
    const p = 1.2, s = cell - p * 2;
    ctx.fillStyle = color;
    roundRect(x * cell + p, y * cell + p, s, s, 3); ctx.fill();
    // 하이라이트
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    roundRect(x * cell + p + 1.5, y * cell + p + 1.5, s - 3, (s - 3) * .38, 2); ctx.fill();
  }

  function render(){
    const W = COLS * cell, H = ROWS * cell;
    ctx.save();
    if(shakeT > 0){
      ctx.translate((Math.random()-.5) * shakeT * 9, (Math.random()-.5) * shakeT * 9);
    }
    // 배경
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    ctx.fillStyle = dark ? '#181b22' : '#e7ece0';
    ctx.fillRect(-12, -12, W + 24, H + 24);
    // 격자
    ctx.strokeStyle = dark ? 'rgba(255,255,255,.045)' : 'rgba(0,0,0,.05)';
    ctx.lineWidth = 1;
    for(let x = 1; x < COLS; x++){ ctx.beginPath(); ctx.moveTo(x*cell,0); ctx.lineTo(x*cell,H); ctx.stroke(); }
    for(let y = 1; y < ROWS; y++){ ctx.beginPath(); ctx.moveTo(0,y*cell); ctx.lineTo(W,y*cell); ctx.stroke(); }

    // 고정 블록
    for(let y = 0; y < ROWS; y++)
      for(let x = 0; x < COLS; x++)
        if(grid[y][x]) block(x, y, grid[y][x]);

    // ★ 소거 대기 줄 — 금빛으로 맥동시켜 "맞히면 터진다"를 알린다
    const pend = pendingRows();
    if(pend.length){
      const a = 0.34 + Math.sin(pulse * 2.2) * 0.26;
      for(const y of pend){
        ctx.fillStyle = `rgba(255,196,70,${a})`;
        ctx.fillRect(0, y * cell, W, cell);
        ctx.strokeStyle = `rgba(255,235,150,${a + 0.35})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(1, y * cell + 1, W - 2, cell - 2);
      }
    }

    // 위험선 (상단 3줄)
    if(stackHeight() >= ROWS - 3){
      ctx.strokeStyle = `rgba(224,67,90,${0.5 + Math.sin(pulse*3)*0.3})`;
      ctx.lineWidth = 2; ctx.setLineDash([5,4]);
      ctx.beginPath(); ctx.moveTo(0, 3*cell); ctx.lineTo(W, 3*cell); ctx.stroke();
      ctx.setLineDash([]);
    }

    // 낙하 조각 + 고스트
    if(piece){
      ctx.globalAlpha = .22;
      for(const [cx, cy] of piece.cells){
        const gy = cy + piece.targetY;
        if(gy >= 0) block(cx + piece.x, gy, piece.color);
      }
      ctx.globalAlpha = 1;
      for(const [cx, cy] of piece.cells){
        const gy = cy + Math.round(piece.y);
        if(gy >= 0) block(cx + piece.x, gy, piece.color);
      }
    }

    // 라인 섬광
    if(flashRows.length && flashT > 0){
      ctx.fillStyle = `rgba(255,255,255,${flashT})`;
      for(const y of flashRows) ctx.fillRect(0, y * cell, W, cell);
    }

    // 파티클
    for(const s of sparks){
      ctx.globalAlpha = Math.max(s.life, 0);
      ctx.fillStyle = s.c;
      ctx.fillRect(s.x - s.s/2, s.y - s.s/2, s.s, s.s);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  return {
    init, stop, drop, garbage, bomb, resize, detonate, setSpeed, pause, resume,
    pending(){ return pendingRows().length; },
    height: stackHeight,
    get lines(){ return lines; },
    get drops(){ return drops; },
    get running(){ return running; }
  };
})();
