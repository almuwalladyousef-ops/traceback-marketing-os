"use client";

import { useTransition } from "react";
import { SlideOver } from "@/components/ui/SlideOver";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { updatePersonalLead } from "@/server/actions/personal";
import type { PersonalLead } from "@/lib/supabase/types";

const STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Archived", label: "Archived" },
  { value: "Dead", label: "Dead" },
];

interface Props {
  lead: PersonalLead;
  onClose: () => void;
}

export function PersonalSlideOver({ lead, onClose }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await updatePersonalLead(lead.id, formData);
    });
  }

  return (
    <SlideOver open onClose={onClose} title={lead.name}>
      <form action={handleSubmit} className="space-y-3">
        <Input label="Name" name="name" defaultValue={lead.name} required />
        <Input label="Handle or URL" name="handle_or_url" defaultValue={lead.handle_or_url ?? ""} />
        <Input label="Phone" name="phone" defaultValue={lead.phone ?? ""} />
        <Input label="Email" name="email" type="email" defaultValue={lead.email ?? ""} />
        <Input label="Where Found" name="where_found" defaultValue={lead.where_found ?? ""} />
        <Input label="Date Found" name="date_found" type="date" defaultValue={lead.date_found ?? ""} />
        <Input label="Follow-up Date" name="follow_up_date" type="date" defaultValue={lead.follow_up_date ?? ""} />
        <Select label="Status" name="status" defaultValue={lead.status} options={STATUS_OPTIONS} />
        <div className="flex gap-2 pt-2">
          <Button type="submit" variant="primary" size="sm" disabled={isPending}>Save</Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </SlideOver>
  );
}
