# VPS Dry Deployment Rollback

## Purpose

This rollback plan is for a future `taiyolabel.site` deployment execution Loop. Loop 108 does not execute rollback commands.

Rollback must remove or disable only amami-line-crm assets. Existing apps and certificates must not be touched.

## Rollback Targets

- `amami-line-crm-api.service`
- `amami-line-crm-admin.service`
- `/etc/nginx/sites-available/amami-line-crm`
- `/etc/nginx/sites-enabled/amami-line-crm`
- `/etc/amami-line-crm`
- `/var/www/amami-line-crm`
- letsencrypt cert name: `amami-line-crm-taiyolabel`

## Do Not Touch

- `/etc/nginx/sites-available/default`
- `/etc/nginx/sites-available/ehime-portal`
- `/etc/nginx/sites-available/line-transport`
- `/etc/nginx/sites-enabled/default`
- `/etc/nginx/sites-enabled/ehime-portal`
- `/etc/nginx/sites-enabled/line-transport`
- `/var/www/ehime-portal`
- `/var/www/line-transport`
- `/var/www/html`
- existing `app.ajnl.net` / `api.ajnl.net` certificate
- `ehime-crawler-admin.service`
- `line-transport-api.service`
- `nginx.service` except for reload after a passing config test in an approved future Loop

## Rollback Order For A Future Loop

Do not execute these commands in Loop 108.

1. Stop amami services.
2. Disable amami services.
3. Remove only the amami-line-crm symlink from `sites-enabled`.
4. Run nginx config test.
5. Reload nginx only if the config test passes.
6. Move `/var/www/amami-line-crm` to a backup path.
7. Move `/etc/amami-line-crm` to a backup path.
8. Delete the `amami-line-crm-taiyolabel` certificate only after confirmation.
9. Verify existing `app.ajnl.net`, `api.ajnl.net`, `ehime-portal`, and `line-transport` still work.

## Future Command Shape

Use `<timestamp>` as an execution-time placeholder. Do not paste real secrets into commands.

```bash
sudo systemctl stop amami-line-crm-api.service || true
sudo systemctl stop amami-line-crm-admin.service || true
sudo systemctl disable amami-line-crm-api.service || true
sudo systemctl disable amami-line-crm-admin.service || true

sudo rm -f /etc/nginx/sites-enabled/amami-line-crm
sudo nginx -t
# Only if nginx -t passes:
sudo systemctl reload nginx

sudo mkdir -p /root/deploy-backups/amami-line-crm/<timestamp>
sudo mv /var/www/amami-line-crm /root/deploy-backups/amami-line-crm/<timestamp>/var-www-amami-line-crm || true
sudo mv /etc/amami-line-crm /root/deploy-backups/amami-line-crm/<timestamp>/etc-amami-line-crm || true
```

Optional certificate removal requires human confirmation first:

```bash
sudo certbot delete --cert-name amami-line-crm-taiyolabel
```

## Rollback No-Go

Stop rollback and ask for human review if:

- The target path is not clearly an amami-line-crm asset.
- The command would modify `default`, `ehime-portal`, `line-transport`, or ajnl certificate assets.
- The nginx config test fails after removing the amami-line-crm symlink.
- The backup path is missing.
- The current operator cannot verify what will be removed.
