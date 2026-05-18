"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SlideOver } from "@/components/ui/SlideOver";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { updateCompany, archiveCompany } from "@/server/actions/companies";
import { createContact, archiveContact, updateContactField } from "@/server/actions/contacts";
import type { Company, Contact } from "@/lib/supabase/types";
import { Plus, Archive, Pencil, Check, X } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "Not Started", label: "Not Started" },
  { value: "In Progress", label: "In Progress" },
  { value: "Replied", label: "Replied" },
  { value: "In Conversation", label: "In Conversation" },
  { value: "Dead", label: "Dead" },
];

interface Props {
  company: Company;
  contacts: Contact[];
  onClose: () => void;
}

function ContactCard({ contact, onArchive }: { contact: Contact; onArchive: (id: string) => void }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState({
    name: contact.name,
    role: contact.role ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    x_handle: contact.x_handle ?? "",
    linkedin_url: contact.linkedin_url ?? "",
  });

  function saveEdit() {
    startTransition(async () => {
      await Promise.all([
        updateContactField(contact.id, "name", draft.name || null),
        updateContactField(contact.id, "role", draft.role || null),
        updateContactField(contact.id, "email", draft.email || null),
        updateContactField(contact.id, "phone", draft.phone || null),
        updateContactField(contact.id, "x_handle", draft.x_handle || null),
        updateContactField(contact.id, "linkedin_url", draft.linkedin_url || null),
      ]);
      setEditing(false);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--accent-line)" }}>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Input label="Name *" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Full name" />
          <Input label="Role" value={draft.role} onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))} placeholder="e.g. VP Marketing" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Input label="Email" value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} placeholder="name@company.com" />
          <Input label="Phone" value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} placeholder="+1 555 000 0000" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Input label="X handle" value={draft.x_handle} onChange={(e) => setDraft((d) => ({ ...d, x_handle: e.target.value }))} placeholder="@handle" />
          <Input label="LinkedIn" value={draft.linkedin_url} onChange={(e) => setDraft((d) => ({ ...d, linkedin_url: e.target.value }))} placeholder="linkedin.com/in/..." />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="primary" size="sm" disabled={isPending} onClick={saveEdit}>
            <Check size={12} /> Save
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
            <X size={12} /> Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{contact.name}</p>
          {contact.role && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{contact.role}</p>}
        </div>
        <div className="flex gap-1">
          <button onClick={() => setEditing(true)} className="p-1 rounded transition-colors" style={{ color: "var(--text-muted)" }} title="Edit contact">
            <Pencil size={12} />
          </button>
          <button onClick={() => onArchive(contact.id)} className="p-1 rounded transition-colors" style={{ color: "var(--text-muted)" }} title="Archive contact">
            <Archive size={12} />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
        {contact.email && <span>{contact.email}</span>}
        {contact.phone && <span>{contact.phone}</span>}
        {contact.x_handle && <span>@{contact.x_handle}</span>}
        {contact.linkedin_url && <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contact.linkedin_url}</span>}
      </div>
    </div>
  );
}

export function CompanySlideOver({ company, contacts, onClose }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAddContact, setShowAddContact] = useState(false);

  function handleCompanySubmit(formData: FormData) {
    startTransition(async () => {
      await updateCompany(company.id, formData);
      router.refresh();
    });
  }

  function handleArchiveCompany() {
    startTransition(async () => {
      await archiveCompany(company.id);
      onClose();
    });
  }

  function handleAddContact(formData: FormData) {
    formData.set("company_id", company.id);
    startTransition(async () => {
      await createContact(formData);
      setShowAddContact(false);
      router.refresh();
    });
  }

  function handleArchiveContact(id: string) {
    startTransition(async () => {
      await archiveContact(id);
      router.refresh();
    });
  }

  return (
    <SlideOver open onClose={onClose} title={company.name} width="max-w-xl">
      <div className="space-y-6">
        {/* Company form */}
        <form action={handleCompanySubmit} className="space-y-3">
          <Input label="Company Name" name="name" defaultValue={company.name ?? ""} required />
          <Input label="Company URL" name="url" defaultValue={company.url ?? ""} />
          <Input label="Industry" name="industry" defaultValue={company.industry ?? ""} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Outreach Date" name="outreach_date" type="date" defaultValue={company.outreach_date ?? ""} />
            <Input label="Follow-up Date" name="follow_up_date" type="date" defaultValue={company.follow_up_date ?? ""} />
          </div>
          <Select label="Status" name="status" defaultValue={company.status} options={STATUS_OPTIONS} />
          <Textarea label="Reply Notes" name="reply_notes" defaultValue={company.reply_notes ?? ""} rows={3} />
          <div className="flex items-center gap-2 pt-1">
            <Button type="submit" variant="primary" size="sm" disabled={isPending}>Save</Button>
            <Button type="button" variant="danger" size="sm" onClick={handleArchiveCompany} disabled={isPending}>
              <Archive size={12} /> Archive
            </Button>
          </div>
        </form>

        {/* Contacts */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.5rem" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Contacts · {contacts.length}
            </h3>
            <Button size="sm" variant="ghost" onClick={() => setShowAddContact(!showAddContact)}>
              <Plus size={12} /> Add
            </Button>
          </div>

          {/* Add contact form */}
          {showAddContact && (
            <form action={handleAddContact} className="p-4 rounded-xl mb-3" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <p className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>New contact</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Input label="Name *" name="name" placeholder="Full name" required />
                <Input label="Role" name="role" placeholder="e.g. VP Marketing" />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Input label="Email" name="email" placeholder="name@company.com" />
                <Input label="Phone" name="phone" placeholder="+1 555 000 0000" />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Input label="X handle" name="x_handle" placeholder="@handle" />
                <Input label="LinkedIn" name="linkedin_url" placeholder="linkedin.com/in/..." />
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="primary" size="sm" disabled={isPending}>Add contact</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddContact(false)}>Cancel</Button>
              </div>
            </form>
          )}

          {/* Contact list */}
          <div className="space-y-2">
            {contacts.length === 0 && !showAddContact && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>No contacts yet.</p>
            )}
            {contacts.map((c) => (
              <ContactCard key={c.id} contact={c} onArchive={handleArchiveContact} />
            ))}
          </div>
        </div>
      </div>
    </SlideOver>
  );
}
