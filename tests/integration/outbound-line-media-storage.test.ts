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
      "tenant_amamihome/outbound/00000000-0000-4000-8000-000000000001/original.mp4",
      "tenant_amamihome/outbound/00000000-0000-4000-8000-000000000001/preview.jpg"
    ]);
    expect(result.media_upload_url).toContain("/tenant_amamihome/outbound/");
    expect(result.preview_upload_url).toContain("/tenant_amamihome/outbound/");
  });

  it("creates one-hour delivery URLs for the same tenant-scoped objects", async () => {
    const signedUrlCalls: Array<{ path: string; expiresIn: number }> = [];
    const client = {
      storage: {
        from() {
          return {
            async createSignedUrl(path: string, expiresIn: number) {
              signedUrlCalls.push({ path, expiresIn });
              return {
                data: { signedUrl: `https://storage.example.invalid/delivery/${path}` },
                error: null
              };
            }
          };
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
