# 05 nginx HTTP Bootstrap Plan

These steps are for a later VPS execution Loop only. Loop 108 does not execute them.

Planned future nginx files:

```text
/etc/nginx/sites-available/amami-line-crm
/etc/nginx/sites-enabled/amami-line-crm
```

Template source:

```text
deploy/vps/taiyolabel/nginx/amami-line-crm-http-bootstrap.conf.template
```

Rules:

- Do not use `default_server`.
- Do not edit existing `default`, `ehime-portal`, or `line-transport` files.
- Use only `admin.taiyolabel.site` and `api.taiyolabel.site` as `server_name`.
- If the nginx config test fails in a future Loop, do not reload nginx.
- Keep HTTP bootstrap separate from HTTPS config.

No-Go:

- Existing sites would be overwritten.
- The template routes another domain.
- The template points to anything other than `127.0.0.1:3100` or `127.0.0.1:8788`.
