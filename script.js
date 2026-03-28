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

// ===== 仮の投稿データ =====
const npcData = [
  {
    left: 250,
    movie: '君の名は。',
    emotion: '切なかった',
    memory: '中学生の夏、友達と自転車で観に行った。\n帰り道に空が赤くて、なんか泣きそうだった。',
    age: '中学生',
    date: '2024年8月3日',
  },
  {
    left: 500,
    movie: 'ラ・ラ・ランド',
    emotion: '美しかった',
    memory: '就活帰りに一人でレイトショー。\n終わったあと、しばらく外に出られなかった。',
    age: '大学生',
    date: '2024年5月17日',
  },
  {
    left: 720,
    movie: '万引き家族',
    emotion: '人の温かさを感じた',
    memory: '雨の日に母と近所の映画館で観た。\nエンドロール中ずっと黙ってた。',
    age: '高校生',
    date: '2024年2月11日',
  },
];

// ===== B領域の要素 =====
const bGuide   = document.getElementById('b-guide');
const bDetail  = document.getElementById('b-detail');
const fOverlay = document.getElementById('form-overlay');

function showDetail(data) {
  document.getElementById('detail-movie').textContent   = data.movie;
  document.getElementById('detail-emotion').textContent = data.emotion;
  document.getElementById('detail-memory').textContent  = data.memory;
  document.getElementById('detail-age').textContent     = data.age;
  document.getElementById('detail-date').textContent    = data.date;
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
  ['step-1','step-2','step-3','step-4','step-done'].forEach(function(id) {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById(stepId).classList.remove('hidden');
}

function resetForm() {
  document.getElementById('input-movie').value = '';
  document.getElementById('input-memory').value = '';
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

document.getElementById('next-3').addEventListener('click', function() {
  if (!document.getElementById('input-memory').value.trim()) return;
  showStep('step-4');
});

document.querySelectorAll('.avatar-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.avatar-btn').forEach(function(b) { b.classList.remove('selected'); });
    btn.classList.add('selected');
    setTimeout(function() { showStep('step-done'); }, 200);
  });
});

document.getElementById('done-btn').addEventListener('click', closeForm);

// ===== NPC生成 =====
const world = document.getElementById('npc-world');
const loopWidth = 800;

[0, loopWidth].forEach(function(offset) {
  npcData.forEach(function(data) {
    const npc = document.createElement('div');
    npc.className = 'npc';
    npc.style.left = (data.left + offset) + 'px';

    const colorClass = emotionColorMap[data.emotion] || '';
    const bubble = document.createElement('div');
    bubble.className   = 'speech-bubble ' + colorClass;
    bubble.textContent = data.movie;
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
