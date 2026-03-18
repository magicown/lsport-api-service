import sys, paramiko, os, time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('172.105.26.83', username='root', password='EhfLRguCw7rMWGH', timeout=30)
sftp = ssh.open_sftp()

# ── Step 1: 프로젝트 기본 구조 생성 ──
print('=== Step 1: Creating project structure ===')

# SvelteKit 프로젝트 초기화 (package.json, svelte.config.js 등은 기존 서버에서 복사)
dirs = [
    '/home/lsportodds/src/lib/components',
    '/home/lsportodds/src/routes/prematch/[sport]',
    '/home/lsportodds/src/routes/inplay/[sport]',
    '/home/lsportodds/src/routes/special/[sport]',
    '/home/lsportodds/src/routes/api/inplay/[sport]',
    '/home/lsportodds/src/routes/api/match/[sport]/[id]',
    '/home/lsportodds/src/routes/login',
    '/home/lsportodds/src/routes/register',
    '/home/lsportodds/src/routes/docs',
    '/home/lsportodds/src/routes/account',
    '/home/lsportodds/src/routes/admin',
    '/home/lsportodds/src/routes/api/logout',
    '/home/lsportodds/src/routes/api/session',
    '/home/lsportodds/src/routes/api/health',
    # API 라우트 (v6 제거된 구조)
    '/home/lsportodds/src/routes/api/auth/register',
    '/home/lsportodds/src/routes/api/auth/login',
    '/home/lsportodds/src/routes/api/auth/refresh',
    '/home/lsportodds/src/routes/api/auth/me',
    '/home/lsportodds/src/routes/api/keys/[keyId]',
    '/home/lsportodds/src/routes/api/keys',
    '/home/lsportodds/src/routes/api/account/ips/[id]',
    '/home/lsportodds/src/routes/api/account/ips',
    '/home/lsportodds/src/routes/api/account/usage',
    '/home/lsportodds/src/routes/api/sports',
    '/home/lsportodds/src/routes/api/prematch/[sport]',
    '/home/lsportodds/src/routes/api/inplay/[sport]',
    '/home/lsportodds/src/routes/api/special/[sport]',
    '/home/lsportodds/src/routes/api/match/[sport]/[id]',
    '/home/lsportodds/src/routes/api/leagues/[sport]',
    '/home/lsportodds/src/routes/api/admin/users/[id]',
    '/home/lsportodds/src/routes/api/admin/users',
    '/home/lsportodds/src/routes/api/admin/stats',
    '/home/lsportodds/src/routes/api/admin/usage',
    # relay_service 엔드포인트 (Ganzi 호환)
    '/home/lsportodds/src/routes/api/relay_service/relay_latest_all.php',
    '/home/lsportodds/src/routes/api/relay_service/relay.php',
    '/home/lsportodds/src/routes/api/relay_service/relay_all.php',
    '/home/lsportodds/src/routes/api/relay_service/inplay.php',
    '/home/lsportodds/src/routes/api/relay_service/inplay_match.php',
    '/home/lsportodds/data',
    '/home/lsportodds/static',
]

for d in dirs:
    ssh.exec_command(f'mkdir -p {d}')
time.sleep(1)
print(f'Created {len(dirs)} directories')

# ── Step 2: 소스 파일 업로드 ──
print('\n=== Step 2: Uploading source files ===')

BASE = 'C:/server/matchdata-api/svelte_files'

files = {
    # ── 페이지 파일 ──
    'layout.svelte': '/home/lsportodds/src/routes/+layout.svelte',
    'layout_server.ts': '/home/lsportodds/src/routes/+layout.server.ts',
    'root_page.svelte': '/home/lsportodds/src/routes/+page.svelte',
    'root_page_server.ts': '/home/lsportodds/src/routes/+page.server.ts',
    'prematch_page.svelte': '/home/lsportodds/src/routes/prematch/[sport]/+page.svelte',
    'prematch_server.ts': '/home/lsportodds/src/routes/prematch/[sport]/+page.server.ts',
    'inplay_page.svelte': '/home/lsportodds/src/routes/inplay/[sport]/+page.svelte',
    'inplay_server.ts': '/home/lsportodds/src/routes/inplay/[sport]/+page.server.ts',
    'inplay_api_server.ts': '/home/lsportodds/src/routes/api/inplay/[sport]/+server.ts',
    'special_page.svelte': '/home/lsportodds/src/routes/special/[sport]/+page.svelte',
    'special_server.ts': '/home/lsportodds/src/routes/special/[sport]/+page.server.ts',
    'MatchDetail.svelte': '/home/lsportodds/src/lib/components/MatchDetail.svelte',
    'match_api_server.ts': '/home/lsportodds/src/routes/api/match/[sport]/[id]/+server.ts',
    'app.css': '/home/lsportodds/src/app.css',
    'login_page.svelte': '/home/lsportodds/src/routes/login/+page.svelte',
    'login_server.ts': '/home/lsportodds/src/routes/login/+page.server.ts',
    'register_page.svelte': '/home/lsportodds/src/routes/register/+page.svelte',
    'register_server.ts': '/home/lsportodds/src/routes/register/+page.server.ts',
    'logout_server.ts': '/home/lsportodds/src/routes/api/logout/+server.ts',
    'session_check_server.ts': '/home/lsportodds/src/routes/api/session/+server.ts',
    'docs_page.svelte': '/home/lsportodds/src/routes/docs/+page.svelte',
    'docs_server.ts': '/home/lsportodds/src/routes/docs/+page.server.ts',
    'account_page.svelte': '/home/lsportodds/src/routes/account/+page.svelte',
    'account_page_server.ts': '/home/lsportodds/src/routes/account/+page.server.ts',
    'admin_page.svelte': '/home/lsportodds/src/routes/admin/+page.svelte',
    'admin_page_server.ts': '/home/lsportodds/src/routes/admin/+page.server.ts',

    # ── Core 라이브러리 ──
    'auth.ts': '/home/lsportodds/src/lib/auth.ts',
    'api-cache.ts': '/home/lsportodds/src/lib/api-cache.ts',
    'hooks_server.ts': '/home/lsportodds/src/hooks.server.ts',
    'app_d_ts.ts': '/home/lsportodds/src/app.d.ts',
    'db.ts': '/home/lsportodds/src/lib/db.ts',
    'jwt.ts': '/home/lsportodds/src/lib/jwt.ts',
    'api-key.ts': '/home/lsportodds/src/lib/api-key.ts',
    'rate-limiter.ts': '/home/lsportodds/src/lib/rate-limiter.ts',
    'ip-whitelist.ts': '/home/lsportodds/src/lib/ip-whitelist.ts',
    'usage-tracker.ts': '/home/lsportodds/src/lib/usage-tracker.ts',
    'plan-limits.ts': '/home/lsportodds/src/lib/plan-limits.ts',
    'middleware.ts': '/home/lsportodds/src/lib/middleware.ts',
    'market-utils.ts': '/home/lsportodds/src/lib/market-utils.ts',
    'logger.ts': '/home/lsportodds/src/lib/logger.ts',
    'validator.ts': '/home/lsportodds/src/lib/validator.ts',

    # ── API 라우트 (v6 제거 → /api/ 직접) ──
    'v6_auth_register_server.ts': '/home/lsportodds/src/routes/api/auth/register/+server.ts',
    'v6_auth_login_server.ts': '/home/lsportodds/src/routes/api/auth/login/+server.ts',
    'v6_auth_refresh_server.ts': '/home/lsportodds/src/routes/api/auth/refresh/+server.ts',
    'v6_auth_me_server.ts': '/home/lsportodds/src/routes/api/auth/me/+server.ts',
    'v6_keys_server.ts': '/home/lsportodds/src/routes/api/keys/+server.ts',
    'v6_keys_keyId_server.ts': '/home/lsportodds/src/routes/api/keys/[keyId]/+server.ts',
    'v6_account_ips_server.ts': '/home/lsportodds/src/routes/api/account/ips/+server.ts',
    'v6_account_ips_id_server.ts': '/home/lsportodds/src/routes/api/account/ips/[id]/+server.ts',
    'v6_account_usage_server.ts': '/home/lsportodds/src/routes/api/account/usage/+server.ts',
    'v6_sports_server.ts': '/home/lsportodds/src/routes/api/sports/+server.ts',
    'v6_prematch_server.ts': '/home/lsportodds/src/routes/api/prematch/[sport]/+server.ts',
    'v6_inplay_server.ts': '/home/lsportodds/src/routes/api/inplay/[sport]/+server.ts',
    'v6_special_server.ts': '/home/lsportodds/src/routes/api/special/[sport]/+server.ts',
    'v6_match_server.ts': '/home/lsportodds/src/routes/api/match/[sport]/[id]/+server.ts',
    'v6_leagues_server.ts': '/home/lsportodds/src/routes/api/leagues/[sport]/+server.ts',
    'v6_admin_users_server.ts': '/home/lsportodds/src/routes/api/admin/users/+server.ts',
    'v6_admin_users_id_server.ts': '/home/lsportodds/src/routes/api/admin/users/[id]/+server.ts',
    'v6_admin_stats_server.ts': '/home/lsportodds/src/routes/api/admin/stats/+server.ts',
    'v6_admin_usage_server.ts': '/home/lsportodds/src/routes/api/admin/usage/+server.ts',

    # relay_service 엔드포인트 (Ganzi 호환)
    'relay_latest_all_server.ts': '/home/lsportodds/src/routes/api/relay_service/relay_latest_all.php/+server.ts',
    'relay_server.ts': '/home/lsportodds/src/routes/api/relay_service/relay.php/+server.ts',
    'relay_all_server.ts': '/home/lsportodds/src/routes/api/relay_service/relay_all.php/+server.ts',
    'relay_inplay_server.ts': '/home/lsportodds/src/routes/api/relay_service/inplay.php/+server.ts',
    'relay_inplay_match_server.ts': '/home/lsportodds/src/routes/api/relay_service/inplay_match.php/+server.ts',
}

ok = 0
fail = 0
for local, remote in files.items():
    try:
        sftp.put(os.path.join(BASE, local), remote)
        ok += 1
    except Exception as e:
        print(f'FAIL: {local} -> {e}')
        fail += 1

print(f'Uploaded: {ok} OK, {fail} FAIL')
sftp.close()
ssh.close()
print('\nStep 2 complete!')
