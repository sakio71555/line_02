import type {
  AdminAiReplyDraftResponse,
  AdminAiSummaryResponse,
  AdminRagAnswerDraftResponse,
  AdminStaffReplyResponse
} from "../../../src/admin-api";

export type ActionStatus = "idle" | "success" | "error";

export interface AiSummaryActionState {
  status: ActionStatus;
  result?: AdminAiSummaryResponse;
  error?: string;
}

export interface AiReplyDraftActionState {
  status: ActionStatus;
  result?: AdminAiReplyDraftResponse;
  error?: string;
}

export interface RagAnswerDraftActionState {
  status: ActionStatus;
  result?: AdminRagAnswerDraftResponse;
  error?: string;
}

export interface StaffReplyActionState {
  status: ActionStatus;
  result?: AdminStaffReplyResponse;
  error?: string;
}
