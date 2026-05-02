const API_BASE = 'https://memory-road.onrender.com';

// ===== エスケープ処理 =====
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ===== BGMトグル =====
const bgm      = document.getElementById('bgm');
const bgmBtn   = document.getElementById('bgm-btn');
const bgmLabel = document.getElementById('bgm-label');

bgm.volume = 0.5;
let isPlaying = false;

bgmBtn.addEventListener('click', function() {
  if (!isPlaying) {
    bgm.play();
    isPlaying = true;
    bgmBtn.classList.add('playing');
    bgmLabel.textContent = 'ON';
  } else {
    bgm.pause();
    isPlaying = false;
    bgmBtn.classList.remove('playing');
    bgmLabel.textContent = 'OFF';
  }
});

// ===== 感情→色クラスのマッピング =====
const emotionColorMap = {
  '楽しかった':        'e-orange',
  'うれしかった':      'e-orange',
  '悲しかった':        'e-blue',
  '切なかった':        'e-blue',
  'ワクワクした':      'e-red',
  '盛り上がった':      'e-red',
  '美しかった':        'e-green',
  '人の温かさを感じた': 'e-green',
  'ドロドロしてた':    'e-purple',
  '怖かった':          'e-purple',
};

// ===== B領域の要素 =====
const bGuide   = document.getElementById('b-guide');
const bDetail  = document.getElementById('b-detail');
const fOverlay = document.getElementById('form-overlay');

function showDetail(data) {
  document.getElementById('detail-movie').textContent   = data.movie;
  const emotionEl = document.getElementById('detail-emotion');
  emotionEl.textContent = data.emotion;
  emotionEl.className = 'detail-emotion ' + (emotionColorMap[data.emotion] || '');
  document.getElementById('detail-memory').textContent  = data.memory;
  document.getElementById('detail-age').textContent     = data.age;
  document.getElementById('detail-initial').textContent = data.initial || '';
  document.getElementById('detail-date').textContent    = data.created_at
    ? new Date(data.created_at).toLocaleDateString('ja-JP')
    : '';
  bGuide.style.display = 'none';
  bDetail.classList.add('active');
}

document.getElementById('b-back').addEventListener('click', function() {
  bDetail.classList.remove('active');
  bGuide.style.display = 'flex';
});

// ===== 投稿フォーム =====
function openForm() {
  fOverlay.classList.add('active');
  resetForm();
}

function closeForm() {
  fOverlay.classList.remove('active');
}

document.getElementById('open-form-btn').addEventListener('click', openForm);
document.getElementById('open-form-btn-2').addEventListener('click', openForm);
document.getElementById('close-form-btn').addEventListener('click', closeForm);

function showStep(stepId) {
  ['step-1','step-2','step-3','step-4','step-5','step-done'].forEach(function(id) {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById(stepId).classList.remove('hidden');
}

function resetForm() {
  document.getElementById('input-movie').value = '';
  document.getElementById('input-memory').value = '';
  document.getElementById('input-initial-1').value = '';
  document.getElementById('input-initial-2').value = '';
  document.querySelectorAll('.emotion-btn, .avatar-btn').forEach(function(btn) {
    btn.classList.remove('selected');
  });
  showStep('step-1');
}

document.getElementById('next-1').addEventListener('click', function() {
  if (!document.getElementById('input-movie').value.trim()) return;
  showStep('step-2');
});

document.querySelectorAll('.emotion-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.emotion-btn').forEach(function(b) { b.classList.remove('selected'); });
    btn.classList.add('selected');
    setTimeout(function() { showStep('step-3'); }, 200);
  });
});

const inputMemory = document.getElementById('input-memory');
const charCount   = document.getElementById('char-count');

inputMemory.addEventListener('input', function() {
  const len = inputMemory.value.length;
  charCount.textContent = len + ' / 50';
  charCount.classList.toggle('limit', len >= 50);
});

document.getElementById('next-3').addEventListener('click', function() {
  if (!inputMemory.value.trim()) return;
  showStep('step-4');
});

// ===== 投稿送信 =====
let selectedEmotion = '';
let selectedAge = '';

document.querySelectorAll('.emotion-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    selectedEmotion = btn.dataset.value;
  });
});

document.querySelectorAll('.avatar-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.avatar-btn').forEach(function(b) { b.classList.remove('selected'); });
    btn.classList.add('selected');
    selectedAge = btn.dataset.value;
    setTimeout(function() { showStep('step-5'); }, 200);
  });
});

document.getElementById('next-5').addEventListener('click', async function() {
  const i1 = document.getElementById('input-initial-1').value.trim().toUpperCase();
  const i2 = document.getElementById('input-initial-2').value.trim().toUpperCase();
  if (!i1 || !i2) {
    alert('イニシャルを入力してください');
    return;
  }
  const initial = i1 + '・' + i2;
  const movie  = document.getElementById('input-movie').value.trim();
  const memory = inputMemory.value.trim();

  try {
    const res = await fetch(API_BASE + '/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movie, emotion: selectedEmotion, memory, age: selectedAge, initial }),
    });
    const result = await res.json();
    if (!res.ok) {
      alert(result.error || '投稿に失敗しました');
      return;
    }
    addNpc(result);
    showStep('step-done');
  } catch (e) {
    alert('通信エラーが発生しました');
  }
});

document.getElementById('done-btn').addEventListener('click', closeForm);

// ===== NPC生成（JSアニメーション・3体リサイクル） =====
const world = document.getElementById('npc-world');

let allPosts      = [];
let nextPostIndex = 0;
let activeNpcs    = []; // { el, pos, postId }

function getNextPost() {
  if (allPosts.length === 0) return null;
  const shownIds = new Set(activeNpcs.map(function(n) { return n.postId; }));
  for (let i = 0; i < allPosts.length; i++) {
    const candidate = allPosts[nextPostIndex % allPosts.length];
    nextPostIndex++;
    if (!shownIds.has(candidate.id)) return candidate;
  }
  // 全投稿が表示中（投稿数 <= MAX_NPCS）の場合はそのまま返す
  const fallback = allPosts[nextPostIndex % allPosts.length];
  nextPostIndex++;
  return fallback;
}
let scrollOffset  = 0;
let lastTimestamp = null;
const SCROLL_SPEED = 52; // px/sec
const MAX_NPCS     = 3;
let currentFilter  = 'all';

function getAreaWidth() {
  return document.querySelector('.area-a').clientWidth;
}

function applyFilterToNpc(npcObj) {
  if (currentFilter === 'all') {
    npcObj.el.style.opacity = '1';
    npcObj.el.style.pointerEvents = '';
  } else {
    const match = npcObj.el._bubble.classList.contains(currentFilter);
    npcObj.el.style.opacity = match ? '1' : '0.15';
    npcObj.el.style.pointerEvents = match ? '' : 'none';
  }
}

function buildNpcEl(data) {
  const npc = document.createElement('div');
  npc.className = 'npc';

  const colorClass = emotionColorMap[data.emotion] || '';
  const bubble = document.createElement('div');
  bubble.className = 'speech-bubble ' + colorClass;
  bubble.innerHTML = escapeHtml(data.movie) +
    (data.initial ? '<span class="bubble-initial"> ' + escapeHtml(data.initial) + '</span>' : '');
  bubble.onclick = function() { showDetail(data); };
  npc._bubble = bubble;

  const head = document.createElement('div');
  head.className = 'npc-head';
  const body = document.createElement('div');
  body.className = 'npc-body';
  const legs = document.createElement('div');
  legs.className = 'npc-legs';
  const legL = document.createElement('div');
  legL.className = 'npc-leg npc-leg-left';
  const legR = document.createElement('div');
  legR.className = 'npc-leg npc-leg-right';
  legs.appendChild(legL);
  legs.appendChild(legR);

  npc.appendChild(bubble);
  npc.appendChild(head);
  npc.appendChild(body);
  npc.appendChild(legs);
  return npc;
}

function refreshNpcContent(npcObj, data) {
  const colorClass = emotionColorMap[data.emotion] || '';
  npcObj.el._bubble.className = 'speech-bubble ' + colorClass;
  npcObj.el._bubble.innerHTML = escapeHtml(data.movie) +
    (data.initial ? '<span class="bubble-initial"> ' + escapeHtml(data.initial) + '</span>' : '');
  npcObj.el._bubble.onclick = function() { showDetail(data); };
  applyFilterToNpc(npcObj);
}

function initNpcs() {
  if (allPosts.length === 0) return;
  const count     = Math.min(MAX_NPCS, allPosts.length);
  const areaWidth = getAreaWidth();
  const spacing   = areaWidth / (count + 1);

  for (let i = 0; i < count; i++) {
    const data = getNextPost();
    if (!data) break;
    const el     = buildNpcEl(data);
    const pos    = scrollOffset + areaWidth + spacing * (i + 1);
    el.style.left = (pos - scrollOffset) + 'px';
    world.appendChild(el);
    const npcObj = { el, pos, postId: data.id };
    activeNpcs.push(npcObj);
    applyFilterToNpc(npcObj);
  }

  requestAnimationFrame(animateNpcs);
}

function animateNpcs(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const delta = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  scrollOffset += SCROLL_SPEED * delta;
  const areaWidth = getAreaWidth();
  const spacing   = areaWidth / MAX_NPCS;

  activeNpcs.forEach(function(npcObj) {
    const visualLeft = npcObj.pos - scrollOffset;

    if (visualLeft < -150) {
      const maxPos = Math.max.apply(null, activeNpcs.map(function(n) { return n.pos; }));
      const minPos = scrollOffset + areaWidth + 50;
      npcObj.pos   = Math.max(maxPos + spacing, minPos);
      const data   = getNextPost();
      if (data) {
        npcObj.postId = data.id;
        refreshNpcContent(npcObj, data);
      }
    }

    npcObj.el.style.left = (npcObj.pos - scrollOffset) + 'px';
  });

  requestAnimationFrame(animateNpcs);
}

function addNpc(data) {
  allPosts.push(data);
  updateMovieSuggestions();
  if (activeNpcs.length < MAX_NPCS) {
    const areaWidth = getAreaWidth();
    const el        = buildNpcEl(data);
    const pos       = scrollOffset + areaWidth * 1.05;
    el.style.left   = (pos - scrollOffset) + 'px';
    world.appendChild(el);
    const npcObj = { el, pos, postId: data.id };
    activeNpcs.push(npcObj);
    applyFilterToNpc(npcObj);
  }
}

// ===== 映画タイトル候補を更新 =====
const movieTitles = [];

function updateMovieSuggestions() {
  const titles = [...new Set(allPosts.map(function(p) { return p.movie; }))];
  movieTitles.length = 0;
  titles.forEach(function(t) { movieTitles.push(t); });
}

function renderSuggestions(query) {
  const datalist = document.getElementById('movie-suggestions');
  if (!query) {
    datalist.innerHTML = '';
    return;
  }
  datalist.innerHTML = movieTitles.map(function(t) {
    return '<option value="' + escapeHtml(t) + '">';
  }).join('');
}

let isComposing = false;
const movieInput = document.getElementById('input-movie');

movieInput.addEventListener('compositionstart', function() {
  isComposing = true;
});

movieInput.addEventListener('compositionend', function() {
  isComposing = false;
  renderSuggestions(this.value);
});

movieInput.addEventListener('input', function() {
  if (!isComposing) renderSuggestions(this.value);
});

// ===== 起動時にAPIから投稿を取得 =====
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

async function loadPosts() {
  try {
    const res = await fetch(API_BASE + '/api/posts');
    allPosts = await res.json();
    shuffleArray(allPosts);
    updateMovieSuggestions();
    initNpcs();
  } catch (e) {
    console.error('投稿の取得に失敗しました', e);
  }
}

loadPosts();

// ===== フィルター =====
document.querySelectorAll('.filter-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    activeNpcs.forEach(function(npcObj) { applyFilterToNpc(npcObj); });
  });
});
