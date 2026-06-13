import type {
  AdminCheckUnrepliedAlertsResponse,
  AdminNotifyOpenAlertsResponse
} from "../../src/admin-api";

export type AlertActionStatus = "idle" | "success" | "error";

export interface CheckUnrepliedActionState {
  status: AlertActionStatus;
  result?: AdminCheckUnrepliedAlertsResponse;
  error?: string;
}

export interface NotifyOpenActionState {
  status: AlertActionStatus;
  result?: AdminNotifyOpenAlertsResponse;
  error?: string;
}
