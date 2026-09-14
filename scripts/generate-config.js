// ビルド時（Vercel）またはローカル開発時に環境変数から js/config.js を生成する。
// js/config.js 自体はGit管理外（.gitignore参照）。秘密情報はこのファイルにも含まれない。
const fs = require('fs');
const path = require('path');

const url = process.env.SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || '';

if (!url || !anonKey) {
  console.warn(
    '[generate-config] SUPABASE_URL / SUPABASE_ANON_KEY が環境変数に見つかりません。' +
      'js/config.js は空の設定で生成され、Supabase同期は無効（localStorageのみ）になります。'
  );
}

const content = `// 自動生成ファイル。Gitには含まれません（.gitignore参照）。
// ローカル: npm run generate-config （.env から読み込み）
// Vercel: ビルド時に Project Settings > Environment Variables の値から自動生成されます。
window.APP_CONFIG = {
  SUPABASE_URL: ${JSON.stringify(url)},
  SUPABASE_ANON_KEY: ${JSON.stringify(anonKey)},
};
`;

const outPath = path.join(__dirname, '..', 'js', 'config.js');
fs.writeFileSync(outPath, content);
console.log(`[generate-config] wrote ${outPath}`);
