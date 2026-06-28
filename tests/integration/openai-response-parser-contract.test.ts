import { describe, expect, it } from "vitest";

import {
  extractOpenAiResponseText,
  OpenAiProviderError,
  normalizeOpenAiResponsesPayload
} from "@amami-line-crm/ai";

describe("Loop 166 OpenAI response parser contract", () => {
  it("extracts text from output_text", () => {
    expect(extractOpenAiResponseText({ output_text: "  parsed text  " })).toBe("parsed text");
  });

  it("extracts text from output message content output_text items", () => {
    expect(
      extractOpenAiResponseText({
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: "nested message text" }]
          }
        ]
      })
    ).toBe("nested message text");
  });

  it("extracts text from output content text items without requiring type", () => {
    expect(
      extractOpenAiResponseText({
        output: [
          {
            content: [{ text: "content text" }]
          }
        ]
      })
    ).toBe("content text");
  });

  it("extracts text from output item text fields", () => {
    expect(
      extractOpenAiResponseText({
        output: [{ type: "output_text", text: "item text" }]
      })
    ).toBe("item text");
  });

  it("extracts text from top-level content array style", () => {
    expect(
      extractOpenAiResponseText({
        content: [{ type: "output_text", text: "top-level content text" }]
      })
    ).toBe("top-level content text");
  });

  it("extracts text from top-level text string style", () => {
    expect(extractOpenAiResponseText({ text: "top-level text" })).toBe("top-level text");
  });

  it("normalizes supported payloads to output_text", () => {
    expect(
      normalizeOpenAiResponsesPayload({
        output: [{ content: [{ text: "{\"draft_body\":\"ok\"}" }] }]
      })
    ).toEqual({ output_text: "{\"draft_body\":\"ok\"}" });
  });

  it("treats blank text as a response parse bug", () => {
    expect(() => extractOpenAiResponseText({ output_text: "   " })).toThrow(OpenAiProviderError);

    try {
      extractOpenAiResponseText({ output_text: "   " });
    } catch (error) {
      expect(error).toBeInstanceOf(OpenAiProviderError);
      expect((error as OpenAiProviderError).classification).toBe("G_response_parse_bug");
      expect((error as OpenAiProviderError).providerOutputTextExtracted).toBe(false);
    }
  });

  it("does not include raw response bodies in parse error messages", () => {
    const rawResponseBody = "RAW_PROVIDER_RESPONSE_BODY_SHOULD_NOT_PRINT";

    try {
      extractOpenAiResponseText({ unexpected: rawResponseBody });
    } catch (error) {
      expect(error).toBeInstanceOf(OpenAiProviderError);
      expect((error as Error).message).not.toContain(rawResponseBody);
      expect((error as OpenAiProviderError).classification).toBe("G_response_parse_bug");
      expect((error as OpenAiProviderError).providerOutputTextExtracted).toBe(false);
    }
  });
});
