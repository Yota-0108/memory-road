require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// ブロックリスト
const blockedIPs = new Set();

// 不正パターン（XSS・SQLインジェクション等）
const suspiciousPatterns = [
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /union\s+select/i,
  /drop\s+table/i,
  /insert\s+into/i,
  /<iframe/i,
  /eval\(/i,
];

function isSuspicious(text) {
  return suspiciousPatterns.some(pattern => pattern.test(text));
}

// IPごとの投稿履歴（1分以内に3件以上で弾く）
const postLog = {};

function isRateLimited(ip) {
  const now = Date.now();
  if (!postLog[ip]) postLog[ip] = [];
  postLog[ip] = postLog[ip].filter(t => now - t < 60000);
  if (postLog[ip].length >= 3) return true;
  postLog[ip].push(now);
  return false;
}

// 許可された選択肢（フォームの選択肢と完全一致のみ受付）
const allowedEmotions = new Set([
  '楽しかった', 'うれしかった', '悲しかった', '切なかった',
  'ワクワクした', '盛り上がった', '美しかった', '人の温かさを感じた',
  'ドロドロしてた', '怖かった',
]);

const allowedAges = new Set([
  '小学生', '中学生', '高校生', '大学生', '社会人', 'それ以外',
]);

// 禁止ワードリスト（追加する場合はここに足す）
const bannedWords = [
  // 差別
  'キチガイ', 'きちがい', '障害者', 'チョン', '朝鮮人', '黒人', 'ガイジ',
  // 性的
  'セックス', 'ちんこ', 'まんこ', 'エロ', 'AV', 'ポルノ',
  // 暴力・脅迫
  '殺す', '殺せ', '死ね', 'ぶっ殺', '爆破', '襲う',
];

function containsBannedWord(text) {
  const lower = text.toLowerCase();
  return bannedWords.some(word => lower.includes(word.toLowerCase()));
}

// 日本語・英語・数字・一般的な記号のみ許可
function isValidText(text) {
  return /^[\u0000-\u007F\u2160-\u2188\u3000-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]+$/.test(text);
}

const ALLOWED_ORIGINS = [
  'https://d17ucnlgw15ddm.cloudfront.net',
  'https://memory-road-app.s3.ap-northeast-3.amazonaws.com',
];

const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.use(cors({
  origin: function(origin, callback) {
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
}));
app.use(express.json({ limit: '10kb' }));

// 投稿一覧を取得
app.get('/api/posts', async (req, res) => {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase error:', error);
    return res.status(500).json({ error: '投稿の取得中にエラーが発生しました' });
  }
  res.json(data);
});

// 投稿を保存
app.post('/api/posts', async (req, res) => {
  const { movie, emotion, memory, age, initial } = req.body;

  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? forwarded.split(',').map(s => s.trim()).pop()
    : req.socket.remoteAddress;

  if (blockedIPs.has(ip)) {
    return res.status(403).json({ error: '投稿できません' });
  }

  if (isRateLimited(ip)) {
    return res.status(429).json({ error: '投稿が多すぎます。少し待ってから再度お試しください' });
  }

  if (!movie || !emotion || !memory || !age || !initial) {
    return res.status(400).json({ error: '全項目を入力してください' });
  }
  if (movie.length > 30 || memory.length > 50) {
    return res.status(400).json({ error: '文字数オーバーです' });
  }
  if (!allowedEmotions.has(emotion)) {
    return res.status(400).json({ error: '無効な感情が選択されています' });
  }
  if (!allowedAges.has(age)) {
    return res.status(400).json({ error: '無効な年齢が選択されています' });
  }
  if (!/^[A-Za-z]・[A-Za-z]$/.test(initial)) {
    return res.status(400).json({ error: 'イニシャルはA・Bの形式で入力してください' });
  }
  if (isSuspicious(movie) || isSuspicious(memory) || isSuspicious(initial)) {
    blockedIPs.add(ip);
    console.warn(`不正アクセス検知によりブロック: ${ip}`);
    return res.status(400).json({ error: '不正な入力が検知されました' });
  }

  if (containsBannedWord(movie) || containsBannedWord(memory)) {
    return res.status(400).json({ error: '投稿に使用できない言葉が含まれています' });
  }
  if (!isValidText(movie) || !isValidText(memory)) {
    return res.status(400).json({ error: '日本語・英語・数字で入力してください' });
  }

  const { data, error } = await supabase
    .from('posts')
    .insert([{ movie, emotion, memory, age, initial }])
    .select()
    .single();

  if (error) {
    console.error('Supabase error:', error);
    return res.status(500).json({ error: '投稿の保存中にエラーが発生しました' });
  }
  res.json(data);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`サーバー起動中: http://localhost:${PORT}`);
});
