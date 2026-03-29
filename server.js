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
  return /^[\u0000-\u007F\u3000-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]+$/.test(text);
}

const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// 投稿一覧を取得
app.get('/api/posts', async (req, res) => {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 投稿を保存
app.post('/api/posts', async (req, res) => {
  const { movie, emotion, memory, age, initial } = req.body;

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

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

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`サーバー起動中: http://localhost:${PORT}`);
});
