-- =========================================================
-- 바른자세 착한 렌탈 플랫폼 - Supabase 클라우드 데이터베이스 설정
-- 프로젝트: https://jurwrizrcfzhzvfpgkot.supabase.co
-- =========================================================

-- 1. app_data 테이블 생성 (JSON 기반 Key-Value 저장소)
create table if not exists public.app_data (
  key text primary key,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Row Level Security (RLS) 활성화
alter table public.app_data enable row level security;

-- 3. 홈페이지 접속자(익명 anon) 읽기 및 쓰기 허용 정책
drop policy if exists "Allow public access to app_data" on public.app_data;
create policy "Allow public access to app_data" on public.app_data
  for all
  using (true)
  with check (true);
