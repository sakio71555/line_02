# Loop 132: owner approval record update

## Goal

Update the public launch owner approval records after Loop 128 without granting production approval.

## Scope

- Add an owner approval status matrix.
- Keep all unknown owners as `unknown / pending`.
- Keep `admin.taiyolabel.site` as review/admin hostname.
- Keep client-facing final hostname as `undecided`.
- Update existing approval and rollback docs.
- Keep `production_no_go`.

## Out of Scope

- Filling unknown owners by guess.
- DNS changes.
- Nginx real-domain enablement.
- certbot / HTTPS.
- external smoke.
- LINE webhook registration.
- Supabase connection.
- `.env` changes.

## Owner Matrix

See [../15_runbooks/owner_approval_status_matrix.md](../15_runbooks/owner_approval_status_matrix.md).

Required owners:

- Domain owner.
- DNS change owner.
- DNS rollback owner.
- Nginx enable approver.
- Certificate approver.
- ACME method approver.
- LINE webhook approver.
- External smoke approver.
- Maintenance window approver.
- Final Go / No-Go owner.
- Supabase staging approver.
- Production secret injection approver.

## Current Decision

```txt
host_purpose=review/admin hostname
client_facing_final_hostname=undecided
owner_approval_status=pending
production_readiness=production_no_go
```

## Next

- Loop 134: owner approval values intake.
