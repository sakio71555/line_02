import { pathToFileURL } from "node:url";

import {
  formatOpenAiProviderBoundarySmokeResult,
  runOpenAiProviderBoundarySmokeCli
} from "./openai-provider-smoke";

async function main(): Promise<void> {
  const result = await runOpenAiProviderBoundarySmokeCli();
  process.stdout.write(result.stdout);
  process.exitCode = result.exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch(() => {
    process.stdout.write(
      formatOpenAiProviderBoundarySmokeResult({
        status: "failed",
        provider: "openai",
        modelConfigured: false,
        requestSent: false,
        responseReceived: false,
        providerOutputTextExtracted: false,
        jsonContractParseSuccess: false,
        jsonContractSchemaValid: false,
        parseStage: "unknown",
        responseBodyRecorded: false,
        promptBodyRecorded: false,
        apiKeyRecorded: false,
        errorClass: "UnhandledProviderSmokeError",
        errorStatus: "unavailable",
        errorCode: "unavailable",
        errorType: "unavailable",
        errorClassification: "I_unknown_sanitized"
      })
    );
    process.exitCode = 1;
  });
}
