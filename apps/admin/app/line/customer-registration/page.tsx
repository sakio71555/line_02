import { CustomerRegistrationForm } from "./customer-registration-form";

export const dynamic = "force-dynamic";

type CustomerRegistrationPageMode = "customer_registration" | "contact_change";

export default async function CustomerRegistrationPage({
  searchParams
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const params = await searchParams;
  const mode = resolveMode(params.mode);

  return <CustomerRegistrationForm mode={mode} />;
}

function resolveMode(value: string | undefined): CustomerRegistrationPageMode {
  return value === "contact-change" || value === "contact_change"
    ? "contact_change"
    : "customer_registration";
}
