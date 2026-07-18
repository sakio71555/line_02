# 01 Read-only Audit

These commands are for a later VPS execution Loop only. Loop 108 does not execute them.

Purpose:

- Confirm the VPS still matches the user audit.
- Confirm ports `3100` and `8788` are free.
- Confirm existing nginx, systemd, and SSL assets before touching anything.

Future commands:

```bash
hostname
whoami
cat /etc/os-release
ss -tulpn | grep -E ':(80|443|3100|8788|8080|8001)\b' || true
sudo systemctl status nginx --no-pager
ls -la /etc/nginx/sites-enabled
ls -la /etc/nginx/sites-available
ls -la /etc/nginx/conf.d
sudo certbot certificates 2>/dev/null || true
node -v || true
corepack --version || true
pnpm -v || true
git --version || true
```

No-Go:

- `3100` or `8788` is already in use.
- nginx is not active.
- expected existing sites `default`, `ehime-portal`, `line-transport` are missing or unexpected.
- `amami-line-crm-*` service already exists and is not understood.
- `/var/www/amami-line-crm` already exists and is not a known release.
