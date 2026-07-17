"use server";

import { revalidatePath } from "next/cache";

import type { ReservationStatus, ReservationType } from "@amami-line-crm/domain";

import { saveAdminReservation } from "../../src/admin-api";
import { getServerAdminApiRequestOptions } from "../admin-api-request-options";

export async function createReservationAction(formData: FormData): Promise<void> {
  const customerId = read(formData, "customer_id");
  const startInput = read(formData, "confirmed_start_at");
  const endInput = read(formData, "confirmed_end_at");
  if (!customerId || !startInput) return;
  const start = new Date(startInput);
  const end = endInput ? new Date(endInput) : null;
  if (Number.isNaN(start.getTime()) || (end && Number.isNaN(end.getTime()))) return;

  await saveAdminReservation({
    customer_id: customerId,
    reservation_type: read(formData, "reservation_type") as ReservationType,
    preferred_dates: [],
    confirmed_start_at: start.toISOString(),
    confirmed_end_at: end?.toISOString() ?? null,
    status: read(formData, "status") as ReservationStatus,
    staff_user_id: null,
    notes: read(formData, "notes") || null
  }, await getServerAdminApiRequestOptions());
  revalidatePath("/calendar");
}

function read(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
