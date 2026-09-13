// Supabaseクライアントのセットアップのみを行う。
// 既存のlocalStorage機能からは呼び出されていない（今後の実装で使用する）。
const SupabaseClient = (() => {
  const config = window.APP_CONFIG;

  if (!config || !config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
    console.warn(
      'Supabaseの設定が見つかりません。js/config.example.js を参考に js/config.js を作成し、SUPABASE_URL / SUPABASE_ANON_KEY を設定してください。'
    );
    return null;
  }

  if (typeof window.supabase === 'undefined') {
    console.warn('Supabase JSクライアントの読み込みに失敗しました。CDNの読み込みを確認してください。');
    return null;
  }

  return window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
})();
