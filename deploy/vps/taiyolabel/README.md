# taiyolabel.site VPS Deployment Templates

These files are templates for a future deployment to the existing VPS at `160.251.174.201`.

Do not copy them to the server without first reading:

- `docs/15_runbooks/vps_deployment_taiyolabel_site.md`
- `docs/11_codex_tasks/106_vps_deployment_plan_and_templates.md`
- `docs/15_runbooks/vps_dry_deployment_preflight_commands.md`
- `docs/15_runbooks/vps_dry_deployment_no_go_checklist.md`

## Public routes

| public route | local upstream | app |
| --- | --- | --- |
| `https://admin.taiyolabel.site/` | `127.0.0.1:3100` | amami-line-crm admin |
| `https://admin.taiyolabel.site/api/` | `127.0.0.1:8788/api/` | amami-line-crm api |
| `https://admin.taiyolabel.site/api/health` | `127.0.0.1:8788/health` | API health |

The current production boundary is same-origin. Do not add a separate API host
to current templates or environment examples.

## Safety notes

- These templates are not applied in Loop 106.
- Do not replace existing `default`, `ehime-portal`, or `line-transport` nginx config.
- Do not reuse the existing `app.ajnl.net` certificate.
- Do not create `.env.production` in the repository.
- Fill production secrets manually on the VPS only, outside git.
- Loop 107 adds production `start` scripts and wires the API planned port boundary. These templates are still not applied to the VPS until a dedicated deployment Loop performs preflight, build/start smoke, systemd install, nginx checks, SSL, and rollback planning.
- Loop 108 adds preflight command packs under `deploy/vps/taiyolabel/preflight/`. They are documentation only and must not be treated as executed work.
- Loop 109 performs only a localhost-bound review/mock deployment subset. Nginx, certbot, LINE webhook, LINE/OpenAI real calls, and Supabase production/staging connections remain out of scope.
