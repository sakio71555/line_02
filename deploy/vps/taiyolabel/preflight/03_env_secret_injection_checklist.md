# 03 Env Secret Injection Checklist

Loop 108 does not create env files and does not display secrets.

Future env files:

```text
/etc/amami-line-crm/api.env
/etc/amami-line-crm/admin.env
```

Rules:

- Do not create `.env.production` in the repository.
- Do not paste values into docs, screenshots, prompts, or commit messages.
- Avoid shell history exposure.
- Use server-side file permissions and a systemd-compatible owner.
- Fill values manually on the VPS or with an approved secret manager.
- Keep real LINE/OpenAI gates disabled first.

Required safe flags:

```text
LINE_MESSAGING_ENABLED=false
LINE_REAL_PUSH_ENABLED=false
AI_PROVIDER=mock
OPENAI_REAL_API_ENABLED=false
```

Template sources:

- `deploy/vps/taiyolabel/env/api.env.example`
- `deploy/vps/taiyolabel/env/admin.env.example`

No-Go:

- Any required env is missing.
- Any secret needs to be shown to Codex or written in git.
- `SUPABASE_SERVICE_ROLE_KEY` would be exposed to browser/client code.
- LINE or OpenAI real gates are enabled before a later approval Loop.
