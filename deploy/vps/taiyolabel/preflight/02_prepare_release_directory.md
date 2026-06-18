# 02 Prepare Release Directory

These commands are for a later VPS execution Loop only. Loop 108 does not execute them.

Planned release directory:

```text
/var/www/amami-line-crm
```

Protect existing paths:

- Do not touch `/var/www/ehime-portal`.
- Do not touch `/var/www/line-transport`.
- Do not touch `/var/www/html`.

Future backup command shape:

```bash
sudo mkdir -p /root/deploy-backups/amami-line-crm/<timestamp>
sudo cp -a /etc/nginx/sites-available /root/deploy-backups/amami-line-crm/<timestamp>/
sudo cp -a /etc/nginx/sites-enabled /root/deploy-backups/amami-line-crm/<timestamp>/
sudo cp -a /etc/nginx/conf.d /root/deploy-backups/amami-line-crm/<timestamp>/
sudo systemctl list-units --type=service --state=running > /root/deploy-backups/amami-line-crm/<timestamp>/running-services.txt
```

Future release directory decision:

- If `/var/www/amami-line-crm` does not exist, create it only after backup and No-Go checks pass.
- If it exists, stop and classify it before overwrite or removal.
- Prefer moving unknown content aside over deleting it.

Do not clone or rsync in Loop 108.
