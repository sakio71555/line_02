# 06 certbot SSL Plan

These steps are for a later VPS execution Loop only. Loop 108 does not execute them.

Future cert name:

```text
amami-line-crm-taiyolabel
```

Domains:

```text
admin.taiyolabel.site
```

Future command shape:

```bash
sudo certbot --nginx --cert-name amami-line-crm-taiyolabel -d admin.taiyolabel.site
```

Rules:

- Do not reuse existing ajnl certificates.
- Do not modify existing ajnl certificates.
- Confirm HTTP bootstrap works before certbot.
- If certbot fails, remove the new amami-line-crm nginx site or restore from backup.

HTTPS template source:

```text
deploy/vps/taiyolabel/nginx/amami-line-crm-ssl.conf.template
```
