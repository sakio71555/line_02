import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  lineAttachmentStorageBucket,
  SupabaseLineAttachmentStorage,
  type SupabaseStorageClient
} from "@amami-line-crm/db";

describe("LINE attachment private storage", () => {
  it("uploads bytes to the private bucket with a deterministic sanitized path", async () => {
    const uploads: Array<{
      bucket: string;
      path: string;
      data: Uint8Array;
      options: { contentType?: string; upsert?: boolean };
    }> = [];
    const client = {
      storage: {
        from(bucket: string) {
          return {
            async upload(
              path: string,
              data: Uint8Array,
              options: { contentType?: string; upsert?: boolean }
            ) {
              uploads.push({ bucket, path, data, options });
              return { data: { path }, error: null };
            }
          };
        }
      }
    } as unknown as SupabaseStorageClient;
    const storage = new SupabaseLineAttachmentStorage(client);

    await expect(
      storage.store({
        tenant_id: "tenant/amamihome",
        customer_id: "customer 1",
        line_message_id: "message/1",
        message_type: "image",
        file_name: null,
        content_type: "image/png",
        data: new Uint8Array([1, 2, 3])
      })
    ).resolves.toEqual({
      media_storage_path: "tenant_amamihome/customer_1/message_1.png"
    });
    expect(uploads).toEqual([
      {
        bucket: lineAttachmentStorageBucket,
        path: "tenant_amamihome/customer_1/message_1.png",
        data: new Uint8Array([1, 2, 3]),
        options: {
          contentType: "image/png",
          upsert: true
        }
      }
    ]);
  });

  it("downloads bytes only from the requested tenant and customer scope", async () => {
    const downloads: Array<{ bucket: string; path: string }> = [];
    const client = {
      storage: {
        from(bucket: string) {
          return {
            async download(path: string) {
              downloads.push({ bucket, path });
              return {
                data: new Blob([new Uint8Array([7, 8, 9])], { type: "image/png" }),
                error: null
              };
            }
          };
        }
      }
    } as unknown as SupabaseStorageClient;
    const storage = new SupabaseLineAttachmentStorage(client);

    const result = await storage.download({
      tenant_id: "tenant_amamihome",
      customer_id: "customer_1",
      media_storage_path: "tenant_amamihome/customer_1/message_1.png"
    });

    expect(result.content_type).toBe("image/png");
    expect(result.data).toBeInstanceOf(Blob);
    expect(new Uint8Array(await result.data.arrayBuffer())).toEqual(new Uint8Array([7, 8, 9]));
    expect(downloads).toEqual([
      {
        bucket: lineAttachmentStorageBucket,
        path: "tenant_amamihome/customer_1/message_1.png"
      }
    ]);
  });

  it("rejects cross-customer and malformed object paths before storage access", async () => {
    let downloadCalls = 0;
    const client = {
      storage: {
        from() {
          return {
            async download() {
              downloadCalls += 1;
              return { data: new Blob(), error: null };
            }
          };
        }
      }
    } as unknown as SupabaseStorageClient;
    const storage = new SupabaseLineAttachmentStorage(client);

    await expect(
      storage.download({
        tenant_id: "tenant_amamihome",
        customer_id: "customer_1",
        media_storage_path: "tenant_amamihome/customer_2/message_1.png"
      })
    ).rejects.toThrow("outside the customer scope");
    await expect(
      storage.download({
        tenant_id: "tenant_amamihome",
        customer_id: "customer_1",
        media_storage_path: "tenant_amamihome/customer_1/../message_1.png"
      })
    ).rejects.toThrow("outside the customer scope");
    expect(downloadCalls).toBe(0);
  });

  it("keeps the attachment bucket private in the migration", () => {
    const migration = readFileSync(
      join(process.cwd(), "packages/db/migrations/0004_line_message_attachment_storage.sql"),
      "utf8"
    );

    expect(migration).toMatch(/insert into storage\.buckets/i);
    expect(migration).toMatch(/'line-message-attachments'/i);
    expect(migration).toMatch(/false,\s*52428800/i);
    expect(migration).toMatch(/set public = false/i);
    expect(migration).not.toMatch(/create policy/i);
  });
});
