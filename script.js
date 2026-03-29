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
  document.getElementById('detail-emotion').textContent = data.emotion;
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
    const res = await fetch('/api/posts', {
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

// ===== NPC生成 =====
const world = document.getElementById('npc-world');
const loopWidth = 800;

function addNpc(data, offset) {
  const left = Math.floor(Math.random() * loopWidth);
  [0, loopWidth].forEach(function(o) {
    const npc = document.createElement('div');
    npc.className = 'npc';
    npc.style.left = (left + (offset !== undefined ? offset : o)) + 'px';

    const colorClass = emotionColorMap[data.emotion] || '';
    const bubble = document.createElement('div');
    bubble.className = 'speech-bubble ' + colorClass;
    bubble.innerHTML = escapeHtml(data.movie) + (data.initial ? '<span class="bubble-initial"> ' + escapeHtml(data.initial) + '</span>' : '');
    bubble.addEventListener('click', function() { showDetail(data); });

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
    world.appendChild(npc);
  });
}

// ===== 起動時にAPIから投稿を取得 =====
async function loadPosts() {
  try {
    const res = await fetch('/api/posts');
    const posts = await res.json();
    posts.forEach(function(data) {
      const left = Math.floor(Math.random() * loopWidth);
      [0, loopWidth].forEach(function(offset) {
        const npc = document.createElement('div');
        npc.className = 'npc';
        npc.style.left = (left + offset) + 'px';

        const colorClass = emotionColorMap[data.emotion] || '';
        const bubble = document.createElement('div');
        bubble.className = 'speech-bubble ' + colorClass;
        bubble.innerHTML = escapeHtml(data.movie) + (data.initial ? '<span class="bubble-initial"> ' + escapeHtml(data.initial) + '</span>' : '');
        bubble.addEventListener('click', function() { showDetail(data); });

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
        world.appendChild(npc);
      });
    });
  } catch (e) {
    console.error('投稿の取得に失敗しました', e);
  }
}

loadPosts();

// ===== フィルター =====
let currentFilter = 'all';

document.querySelectorAll('.filter-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;

    // 新しく追加されるNPCにフィルターを適用（既存NPCはそのまま）
    document.querySelectorAll('.npc').forEach(function(npc) {
      const bubble = npc.querySelector('.speech-bubble');
      if (!bubble) return;
      if (currentFilter === 'all') {
        npc.style.opacity = '1';
        npc.style.pointerEvents = '';
      } else {
        const match = bubble.classList.contains(currentFilter);
        npc.style.opacity = match ? '1' : '0.15';
        npc.style.pointerEvents = match ? '' : 'none';
      }
    });
  });
});
