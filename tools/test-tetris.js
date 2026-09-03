/* AI 테트리스의 화면 밖 타이머 누수를 브라우저 없이 검증한다. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'js', 'tetris.js'), 'utf8');
let nextId = 1;
const timeouts = new Map(), intervals = new Map(), frames = new Map();
const context = {
  console, Math, Array, Set,
  window:{ devicePixelRatio:1 },
  document:{ documentElement:{ getAttribute(){ return 'light'; } } },
  setTimeout(fn){ const id = nextId++; timeouts.set(id, fn); return id; },
  clearTimeout(id){ timeouts.delete(id); },
  setInterval(fn){ const id = nextId++; intervals.set(id, fn); return id; },
  clearInterval(id){ intervals.delete(id); },
  requestAnimationFrame(fn){ const id = nextId++; frames.set(id, fn); return id; },
  cancelAnimationFrame(id){ frames.delete(id); }
};
vm.runInNewContext(SOURCE + ';globalThis.Tetris = Tetris;', context);

const noop = () => {};
const canvas = {
  clientWidth:200, style:{},
  getContext(){
    return new Proxy({}, {
      get(target, key){
        if(!(key in target)) target[key] = noop;
        return target[key];
      },
      set(target, key, value){ target[key] = value; return true; }
    });
  }
};

context.Tetris.init(canvas);
context.Tetris.drop(2);
assert.strictEqual(timeouts.size, 2, '초기 보너스 투하 예약 수');

// 첫 블록이 떨어지는 동안 두 번째 예약은 120ms 재시도로 바뀐다.
const first = [...timeouts.entries()][0];
timeouts.delete(first[0]); first[1]();
const second = [...timeouts.entries()][0];
timeouts.delete(second[0]); second[1]();
assert.strictEqual(timeouts.size, 1, '진행 중인 블록의 재시도 예약');

context.Tetris.stop();
assert.strictEqual(timeouts.size, 0, '종료 뒤 지연 투하 타이머');
assert.strictEqual(intervals.size, 0, '종료 뒤 자동 투하 타이머');
assert.strictEqual(frames.size, 0, '종료 뒤 렌더 프레임');

// 새 지연 동작은 later() 한곳으로만 예약되어야 stop()이 빠짐없이 거둔다.
assert.strictEqual((SOURCE.match(/setTimeout\s*\(/g) || []).length, 1,
  '추적되지 않는 지연 타이머가 추가됨');
