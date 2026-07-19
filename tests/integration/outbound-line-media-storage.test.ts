import { describe, expect, it } from "vitest";

import { SupabaseOutboundLineMediaStorage } from "@amami-line-crm/db";

describe("outbound LINE media private storage", () => {
  it("creates upload URLs only for tenant-scoped original and preview paths", async () => {
    const signedUploadPaths: string[] = [];
    const client = {
      storage: {
        from(bucket: string) {
          expect(bucket).toBe("line-message-attachments");
          return {
            async createSignedUploadUrl(path: string) {
              signedUploadPaths.push(path);
              return {
                data: { signedUrl: `https://storage.example.invalid/upload/${path}` },
                error: null
              };
            }
          };
        }
      }
    };
    const storage = new SupabaseOutboundLineMediaStorage(client as never);

    const result = await storage.prepareUpload({
      tenant_id: "tenant_amamihome",
      media_id: "00000000-0000-4000-8000-000000000001",
      media_type: "video",
      content_type: "video/mp4",
      preview_content_type: "image/jpeg"
    });

    expect(signedUploadPaths).toEqual([
      "tenant_amamihome/outbound-prepared/00000000-0000-4000-8000-000000000001-original.mp4",
      "tenant_amamihome/outbound-prepared/00000000-0000-4000-8000-000000000001-preview.jpg"
    ]);
    expect(result.media_upload_url).toContain("/tenant_amamihome/outbound-prepared/");
    expect(result.preview_upload_url).toContain("/tenant_amamihome/outbound-prepared/");
  });

  it("resolves prepared paths without creating delivery URLs", async () => {
    let storageCalls = 0;
    const client = {
      storage: {
        from() {
          storageCalls += 1;
          throw new Error("Resolving prepared paths must not access storage.");
        }
      }
    };
    const storage = new SupabaseOutboundLineMediaStorage(client as never);

    const result = await storage.resolveUpload({
      tenant_id: "tenant_amamihome",
      media_id: "00000000-0000-4000-8000-000000000002",
      media_type: "image",
      content_type: "image/png",
      preview_content_type: "image/png"
    });

    expect(storageCalls).toBe(0);
    expect(result).toEqual({
      media_storage_path:
        "tenant_amamihome/outbound-prepared/00000000-0000-4000-8000-000000000002-original.png",
      preview_storage_path:
        "tenant_amamihome/outbound-prepared/00000000-0000-4000-8000-000000000002-preview.png"
    });
  });

  it("inspects tenant-scoped object metadata without downloading the object", async () => {
    const inspectedPaths: string[] = [];
    const client = {
      storage: {
        from() {
          return {
            async info(path: string) {
              inspectedPaths.push(path);
              return {
                data: { size: 8, contentType: "image/png" },
                error: null
              };
            },
            async download() {
              throw new Error("Metadata inspection must not download the object.");
            }
          };
        }
      }
    };
    const storage = new SupabaseOutboundLineMediaStorage(client as never);

    const result = await storage.inspect({
      tenant_id: "tenant_amamihome",
      media_storage_path:
        "tenant_amamihome/outbound-prepared/00000000-0000-4000-8000-000000000002-original.png"
    });

    expect(result).toEqual({ size: 8, content_type: "image/png" });
    expect(inspectedPaths).toEqual([
      "tenant_amamihome/outbound-prepared/00000000-0000-4000-8000-000000000002-original.png"
    ]);
  });

  it("moves validated uploads to durable paths before creating one-hour delivery URLs", async () => {
    const moveCalls: Array<{ from: string; to: string }> = [];
    const signedUrlCalls: Array<{ path: string; expiresIn: number }> = [];
    const client = {
      storage: {
        from() {
          return {
            async move(from: string, to: string) {
              moveCalls.push({ from, to });
              return { data: { message: "Moved" }, error: null };
            },
            async createSignedUrl(path: string, expiresIn: number) {
              signedUrlCalls.push({ path, expiresIn });
              return {
                data: { signedUrl: `https://storage.example.invalid/delivery/${path}` },
                error: null
              };
            },
            async remove() {
              return { data: [], error: null };
            }
          };
        }
      }
    };
    const storage = new SupabaseOutboundLineMediaStorage(client as never);

    const result = await storage.finalizeUpload({
      tenant_id: "tenant_amamihome",
      media_id: "00000000-0000-4000-8000-000000000002",
      media_type: "image",
      content_type: "image/png",
      preview_content_type: "image/png"
    });

    expect(moveCalls).toEqual([
      {
        from: "tenant_amamihome/outbound-prepared/00000000-0000-4000-8000-000000000002-original.png",
        to: "tenant_amamihome/outbound/00000000-0000-4000-8000-000000000002/original.png"
      },
      {
        from: "tenant_amamihome/outbound-prepared/00000000-0000-4000-8000-000000000002-preview.png",
        to: "tenant_amamihome/outbound/00000000-0000-4000-8000-000000000002/preview.png"
      }
    ]);
    expect(signedUrlCalls).toEqual([
      {
        path: "tenant_amamihome/outbound/00000000-0000-4000-8000-000000000002/original.png",
        expiresIn: 3600
      },
      {
        path: "tenant_amamihome/outbound/00000000-0000-4000-8000-000000000002/preview.png",
        expiresIn: 3600
      }
    ]);
    expect(result).toMatchObject({
      media_storage_path:
        "tenant_amamihome/outbound/00000000-0000-4000-8000-000000000002/original.png",
      preview_storage_path:
        "tenant_amamihome/outbound/00000000-0000-4000-8000-000000000002/preview.png"
    });
  });

  it("removes partial durable media when preview finalization fails", async () => {
    const moveCalls: Array<{ from: string; to: string }> = [];
    const removeCalls: string[][] = [];
    const client = {
      storage: {
        from() {
          return {
            async move(from: string, to: string) {
              moveCalls.push({ from, to });
              return moveCalls.length === 2
                ? { data: null, error: new Error("preview move failed") }
                : { data: { message: "Moved" }, error: null };
            },
            async remove(paths: string[]) {
              removeCalls.push(paths);
              return { data: [], error: null };
            }
          };
        }
      }
    };
    const storage = new SupabaseOutboundLineMediaStorage(client as never);

    await expect(
      storage.finalizeUpload({
        tenant_id: "tenant_amamihome",
        media_id: "00000000-0000-4000-8000-000000000002",
        media_type: "image",
        content_type: "image/png",
        preview_content_type: "image/png"
      })
    ).rejects.toThrow("Outbound LINE media preview finalization failed.");

    expect(moveCalls).toHaveLength(2);
    expect(removeCalls).toEqual([
      [
        "tenant_amamihome/outbound/00000000-0000-4000-8000-000000000002/original.png",
        "tenant_amamihome/outbound-prepared/00000000-0000-4000-8000-000000000002-original.png",
        "tenant_amamihome/outbound-prepared/00000000-0000-4000-8000-000000000002-preview.png"
      ]
    ]);
  });

  it("retries compensating cleanup before reporting the preview failure", async () => {
    let moveCount = 0;
    let removeCount = 0;
    const client = {
      storage: {
        from() {
          return {
            async move() {
              moveCount += 1;
              return moveCount === 2
                ? { data: null, error: new Error("preview move failed") }
                : { data: { message: "Moved" }, error: null };
            },
            async remove() {
              removeCount += 1;
              return removeCount < 3
                ? { data: null, error: new Error("transient cleanup failure") }
                : { data: [], error: null };
            }
          };
        }
      }
    };
    const storage = new SupabaseOutboundLineMediaStorage(client as never);

    await expect(
      storage.finalizeUpload({
        tenant_id: "tenant_amamihome",
        media_id: "00000000-0000-4000-8000-000000000020",
        media_type: "image",
        content_type: "image/png",
        preview_content_type: "image/png"
      })
    ).rejects.toThrow("Outbound LINE media preview finalization failed.");

    expect(removeCount).toBe(3);
  });

  it("surfaces compensating cleanup failure after the bounded retries", async () => {
    let moveCount = 0;
    let removeCount = 0;
    const client = {
      storage: {
        from() {
          return {
            async move() {
              moveCount += 1;
              return moveCount === 2
                ? { data: null, error: new Error("preview move failed") }
                : { data: { message: "Moved" }, error: null };
            },
            async remove() {
              removeCount += 1;
              return { data: null, error: new Error("cleanup failed") };
            }
          };
        }
      }
    };
    const storage = new SupabaseOutboundLineMediaStorage(client as never);

    await expect(
      storage.finalizeUpload({
        tenant_id: "tenant_amamihome",
        media_id: "00000000-0000-4000-8000-000000000021",
        media_type: "image",
        content_type: "image/png",
        preview_content_type: "image/png"
      })
    ).rejects.toThrow(
      "Outbound LINE media cleanup failed after preview finalization failure."
    );

    expect(removeCount).toBe(3);
  });

  it("removes only expired prepared uploads returned by the bounded scan", async () => {
    const removedPaths: string[][] = [];
    const client = {
      storage: {
        from() {
          return {
            async list() {
              return {
                data: [
                  {
                    name: "00000000-0000-4000-8000-000000000010-original.jpg",
                    created_at: "2026-07-17T00:00:00.000Z"
                  },
                  {
                    name: "00000000-0000-4000-8000-000000000010-preview.jpg",
                    created_at: "2026-07-17T00:00:00.000Z"
                  },
                  {
                    name: "00000000-0000-4000-8000-000000000011-original.jpg",
                    created_at: "2026-07-19T00:00:00.000Z"
                  },
                  { name: "unexpected-object", created_at: "2026-07-17T00:00:00.000Z" }
                ],
                error: null
              };
            },
            async remove(paths: string[]) {
              removedPaths.push(paths);
              return { data: [], error: null };
            }
          };
        }
      }
    };
    const storage = new SupabaseOutboundLineMediaStorage(client as never);

    const removedCount = await storage.removeExpiredUploads({
      tenant_id: "tenant_amamihome",
      expires_before: "2026-07-18T00:00:00.000Z",
      limit: 100
    });

    expect(removedCount).toBe(2);
    expect(removedPaths).toEqual([[
      "tenant_amamihome/outbound-prepared/00000000-0000-4000-8000-000000000010-original.jpg",
      "tenant_amamihome/outbound-prepared/00000000-0000-4000-8000-000000000010-preview.jpg"
    ]]);
  });

  it("removes the uploaded original when preview storage fails", async () => {
    const uploadedPaths: string[] = [];
    const removedPaths: string[][] = [];
    const client = {
      storage: {
        from() {
          return {
            async upload(path: string) {
              uploadedPaths.push(path);
              if (path.endsWith("preview.jpg")) {
                return { data: null, error: new Error("preview failure") };
              }
              return { data: { path }, error: null };
            },
            async remove(paths: string[]) {
              removedPaths.push(paths);
              return { data: [], error: null };
            }
          };
        }
      }
    };
    const storage = new SupabaseOutboundLineMediaStorage(client as never);

    await expect(
      storage.store({
        tenant_id: "tenant_amamihome",
        media_id: "00000000-0000-4000-8000-000000000003",
        media_type: "image",
        content_type: "image/jpeg",
        data: new Uint8Array([0xff, 0xd8, 0xff]),
        preview_content_type: "image/jpeg",
        preview_data: new Uint8Array([0xff, 0xd8, 0xff])
      })
    ).rejects.toThrow("preview storage failed");

    expect(uploadedPaths).toEqual([
      "tenant_amamihome/outbound/00000000-0000-4000-8000-000000000003/original.jpg",
      "tenant_amamihome/outbound/00000000-0000-4000-8000-000000000003/preview.jpg"
    ]);
    expect(removedPaths).toEqual([
      ["tenant_amamihome/outbound/00000000-0000-4000-8000-000000000003/original.jpg"]
    ]);
  });

  it("rejects malformed tenant and media identifiers before storage access", async () => {
    let storageCalls = 0;
    const client = {
      storage: {
        from() {
          storageCalls += 1;
          throw new Error("Storage must not be accessed for malformed identifiers.");
        }
      }
    };
    const storage = new SupabaseOutboundLineMediaStorage(client as never);
    const validInput = {
      tenant_id: "tenant_amamihome",
      media_id: "media_1",
      media_type: "image" as const,
      content_type: "image/png" as const,
      data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      preview_content_type: "image/png" as const,
      preview_data: new Uint8Array([0x89, 0x50, 0x4e, 0x47])
    };

    await expect(
      storage.store({ ...validInput, tenant_id: "tenant/amamihome" })
    ).rejects.toThrow("path is invalid");
    await expect(storage.store({ ...validInput, media_id: "media/1" })).rejects.toThrow(
      "path is invalid"
    );
    expect(storageCalls).toBe(0);
  });

  it("rejects cross-tenant and malformed paths before storage access", async () => {
    let storageCalls = 0;
    const client = {
      storage: {
        from() {
          storageCalls += 1;
          throw new Error("Storage must not be accessed for an invalid path.");
        }
      }
    };
    const storage = new SupabaseOutboundLineMediaStorage(client as never);

    await expect(
      storage.inspect({
        tenant_id: "tenant_amamihome",
        media_storage_path: "tenant_other/outbound/media_1/original.png"
      })
    ).rejects.toThrow("outside the tenant scope");
    await expect(
      storage.download({
        tenant_id: "tenant_amamihome",
        media_storage_path: "tenant_other/outbound/media_1/original.png"
      })
    ).rejects.toThrow("outside the tenant scope");
    await expect(
      storage.remove({
        tenant_id: "tenant/amamihome",
        media_storage_paths: ["tenant_amamihome/outbound/media_1/original.png"]
      })
    ).rejects.toThrow("path is invalid");
    expect(storageCalls).toBe(0);
  });
});
