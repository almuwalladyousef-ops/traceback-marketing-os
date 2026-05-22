import { getCompanies } from "@/server/queries/email";
import { EmailOutreachClient } from "@/components/outreach/EmailOutreachClient";

export const dynamic = "force-dynamic";

export default async function EmailOutreachPage() {
  const companies = await getCompanies();
  return <EmailOutreachClient companies={companies} />;
}
