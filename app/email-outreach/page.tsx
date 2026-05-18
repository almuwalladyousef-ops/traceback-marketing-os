import { getCompanies } from "@/server/queries/email";
import { createServerClient } from "@/lib/supabase/server";
import { EmailOutreachClient } from "@/components/outreach/EmailOutreachClient";
import type { Contact } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function EmailOutreachPage() {
  const companies = await getCompanies();

  const db = createServerClient();
  const ids = companies.map((c) => c.id);
  let contacts: Contact[] = [];
  if (ids.length > 0) {
    const { data } = await db
      .from("contacts")
      .select("*")
      .in("company_id", ids)
      .eq("archived", false)
      .order("created_at");
    contacts = data ?? [];
  }

  const contactsByCompany: Record<string, Contact[]> = {};
  for (const contact of contacts) {
    if (!contactsByCompany[contact.company_id]) {
      contactsByCompany[contact.company_id] = [];
    }
    contactsByCompany[contact.company_id].push(contact);
  }

  return (
    <EmailOutreachClient companies={companies} contactsByCompany={contactsByCompany} />
  );
}
