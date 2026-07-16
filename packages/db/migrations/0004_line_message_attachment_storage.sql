insert into storage.buckets (id, name, public, file_size_limit)
values (
  'line-message-attachments',
  'line-message-attachments',
  false,
  52428800
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit;
