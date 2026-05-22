import { getCompanies } from "@/server/queries/email";
import { getAllContactsByCompany } from "@/server/actions/contacts";
import { EmailOutreachClient } from "@/components/outreach/EmailOutreachClient";

export const dynamic = "force-dynamic";

export default async function EmailOutreachPage() {
  const companies = await getCompanies();
  const contactsByCompany = await getAllContactsByCompany(companies.map((c) => c.id));
  return <EmailOutreachClient companies={companies} contactsByCompany={contactsByCompany} />;
}
