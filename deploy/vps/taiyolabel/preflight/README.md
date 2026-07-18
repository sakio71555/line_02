# taiyolabel.site VPS Preflight Pack

This folder contains operator-facing command plans for a future VPS dry deployment.

Loop 108 does not execute these commands. Do not SSH, do not create files on the VPS, do not run nginx, systemd, certbot, LINE, OpenAI, or Supabase commands in this Loop.

Read in order:

1. `01_read_only_audit.md`
2. `02_prepare_release_directory.md`
3. `03_env_secret_injection_checklist.md`
4. `04_local_service_smoke_plan.md`
5. `05_nginx_http_bootstrap_plan.md`
6. `06_certbot_ssl_plan.md`
7. `07_external_smoke_plan.md`
8. `99_rollback_plan.md`

Planned upstreams:

- Admin: `127.0.0.1:3100`
- API: `127.0.0.1:8788`

Do not touch existing `default`, `ehime-portal`, `line-transport`, `/var/www/ehime-portal`, `/var/www/line-transport`, `/var/www/html`, or the existing ajnl certificate.
