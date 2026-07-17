update public.tenant_workspace_settings as settings
set line_experience = jsonb_set(
  settings.line_experience,
  '{menus}',
  (
    select jsonb_agg(
      case menu ->> 'name'
        when 'Amami Home Initial Menu'
          then jsonb_set(menu, '{name}', to_jsonb('初期メニュー'::text))
        when 'Amami Home Negotiation Menu'
          then jsonb_set(menu, '{name}', to_jsonb('商談中メニュー'::text))
        when 'Amami Home Aftercare Menu'
          then jsonb_set(menu, '{name}', to_jsonb('アフターメニュー'::text))
        else menu
      end
      order by ordinal
    )
    from jsonb_array_elements(settings.line_experience -> 'menus')
      with ordinality as configured_menus(menu, ordinal)
  ),
  false
)
where jsonb_typeof(settings.line_experience -> 'menus') = 'array'
  and exists (
    select 1
    from jsonb_array_elements(settings.line_experience -> 'menus') as configured_menus(menu)
    where menu ->> 'name' in (
      'Amami Home Initial Menu',
      'Amami Home Negotiation Menu',
      'Amami Home Aftercare Menu'
    )
  );
