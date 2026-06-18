# 99 Rollback Plan

This is a pointer to the main rollback runbook:

```text
docs/15_runbooks/vps_dry_deployment_rollback.md
```

Loop 108 does not execute rollback commands.

Rollback must only touch amami-line-crm assets:

- `amami-line-crm-api.service`
- `amami-line-crm-admin.service`
- `/etc/nginx/sites-available/amami-line-crm`
- `/etc/nginx/sites-enabled/amami-line-crm`
- `/etc/amami-line-crm`
- `/var/www/amami-line-crm`
- `amami-line-crm-taiyolabel` certificate, only after confirmation

Do not touch:

- existing `default`, `ehime-portal`, `line-transport` nginx files
- `/var/www/ehime-portal`
- `/var/www/line-transport`
- existing ajnl certificate
- `ehime-crawler-admin.service`
- `line-transport-api.service`
