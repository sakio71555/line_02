# Loop 313: LIFF customer registration and contact change

## Summary

```txt
loop_313_status=complete
scope=production_customer_profile_liff_form
production_go=true
dr_readiness_status=not_ready_restore_failed
line_real_send_executed=false
openai_api_executed=false
supabase_direct_connection_executed=false
secret_values_recorded=false
```

## Scope

- Add a LIFF identity-verified customer profile form for rich menu entry points.
- Support customer information registration and contact change modes.
- Reflect submitted values to CRM customer detail.
- Save the submitted consultation/contact-change summary to the customer timeline.
- Update rich menu definitions so customer registration and contact change open the LIFF form.

## Implemented Behavior

```txt
customer_registration_form_created=true
contact_change_form_created=true
liff_identity_verification_required=true
crm_customer_detail_update=true
timeline_form_message_created=true
information_registered_badge_source=interest_tag
rich_menu_initial_customer_info_action=uri_liff_form
rich_menu_aftercare_contact_change_action=uri_liff_form
```

Registration fields:

- お名前
- 電話番号
- 郵便番号
- 住所またはエリア
- メールアドレス
- 相談種別
- 相談内容
- 希望連絡方法
- 連絡希望時間

Contact change fields:

- お名前
- 電話番号
- 郵便番号
- 住所またはエリア
- メールアドレス
- 希望連絡方法
- 連絡希望時間
- 備考

## Out Of Scope

- LINE実送信
- OpenAI API実行
- Supabase direct connection or migration
- LINE rich menu API apply
- LINE in-chat hearing workflow
- AI automatic answer workflow
- Customer stage/rich menu switching automation

## Safety

```txt
line_send_attempted=false
openai_api_called=false
supabase_direct_connection_executed=false
secret_values_recorded=false
line_user_id_recorded_in_docs=false
raw_log_recorded=false
```

The LIFF customer profile API response intentionally does not return the LINE user id. The LINE user id is used server-side only to bind the verified LINE identity to the CRM customer record.
