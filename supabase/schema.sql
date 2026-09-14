-- exam-roadmap-planner: planner_state テーブル
-- Supabaseダッシュボードの SQL Editor で実行してください。
-- anonキーだけではテーブル作成ができないため、この手順は手動で行う必要があります。

create table if not exists public.planner_state (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.planner_state enable row level security;

-- 暫定ポリシー：認証画面がまだ無いため、anonキーからの読み書きを許可しています。
-- 認証を実装したら、家族/本人のみに絞り込むポリシーに置き換えてください。
create policy "planner_state anon full access"
  on public.planner_state
  for all
  using (true)
  with check (true);
