import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Trash2, CalendarClock, Mail, Phone, Tag } from "lucide-react";

export const Route = createFileRoute("/_authenticated/leads/$id")({
  head: () => ({ meta: [{ title: "Lead — Nexus CRM" }] }),
  component: LeadDetail,
});

type LeadStatus = "new" | "contacted" | "converted";
type Lead = {
  id: string; name: string; email: string; phone: string | null;
  source: string | null; status: LeadStatus; created_at: string; updated_at: string;
};
type Note = { id: string; lead_id: string; body: string; follow_up_at: string | null; created_at: string };

const statusStyles: Record<LeadStatus, string> = {
  new: "bg-primary/15 text-primary border-primary/30",
  contacted: "bg-warning/15 text-warning border-warning/30",
  converted: "bg-success/15 text-success border-success/30",
};

const leadUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  source: z.string().trim().max(80).optional().or(z.literal("")),
});

const noteSchema = z.object({
  body: z.string().trim().min(1, "Note can't be empty").max(2000),
  follow_up_at: z.string().optional().or(z.literal("")),
});

function LeadDetail() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const leadQ = useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Lead;
    },
  });

  const notesQ = useQuery({
    queryKey: ["lead-notes", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("lead_notes").select("*").eq("lead_id", id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Note[];
    },
  });

  const updateLead = useMutation({
    mutationFn: async (patch: Partial<Lead>) => {
      const { error } = await supabase.from("leads").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", id] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addNote = useMutation({
    mutationFn: async ({ body, follow_up_at }: { body: string; follow_up_at: string | null }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("lead_notes").insert({
        lead_id: id, body, follow_up_at, created_by: userData.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-notes", id] });
      toast.success("Note added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from("lead_notes").delete().eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lead-notes", id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteLead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead deleted");
      navigate({ to: "/leads" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (leadQ.isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…</div>;
  }
  if (leadQ.error || !leadQ.data) {
    return <div className="py-20 text-center text-muted-foreground">Lead not found.</div>;
  }

  const lead = leadQ.data;

  return (
    <div className="space-y-8">
      <Link to="/leads" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{lead.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{lead.email}</span>
            {lead.phone && <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{lead.phone}</span>}
            {lead.source && <span className="inline-flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" />{lead.source}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={lead.status} onValueChange={(v) => updateLead.mutate({ status: v as LeadStatus })}>
            <SelectTrigger className={`w-[160px] border ${statusStyles[lead.status]}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this lead?")) deleteLead.mutate(); }}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <EditCard lead={lead} onSave={(patch) => updateLead.mutate(patch)} />
        <NotesCard
          notes={notesQ.data ?? []}
          loading={notesQ.isLoading}
          onAdd={(v) => addNote.mutate(v)}
          onDelete={(noteId) => deleteNote.mutate(noteId)}
        />
      </div>
    </div>
  );
}

function EditCard({ lead, onSave }: { lead: Lead; onSave: (patch: Partial<Lead>) => void }) {
  const [saving, setSaving] = useState(false);
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = leadUpdateSchema.safeParse({
      name: fd.get("name"), email: fd.get("email"),
      phone: fd.get("phone") || "", source: fd.get("source") || "",
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSaving(true);
    onSave({
      name: parsed.data.name, email: parsed.data.email,
      phone: parsed.data.phone || null, source: parsed.data.source || null,
    });
    setTimeout(() => setSaving(false), 300);
    toast.success("Saved");
  }
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <h2 className="font-display text-lg font-semibold">Details</h2>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Field label="Name" name="name" defaultValue={lead.name} />
        <Field label="Email" name="email" type="email" defaultValue={lead.email} />
        <Field label="Phone" name="phone" defaultValue={lead.phone ?? ""} />
        <Field label="Source" name="source" defaultValue={lead.source ?? ""} />
        <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save changes</Button>
      </form>
    </div>
  );
}

function NotesCard({ notes, loading, onAdd, onDelete }: {
  notes: Note[]; loading: boolean;
  onAdd: (v: { body: string; follow_up_at: string | null }) => void;
  onDelete: (id: string) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = noteSchema.safeParse({ body: fd.get("body"), follow_up_at: fd.get("follow_up_at") || "" });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSubmitting(true);
    onAdd({ body: parsed.data.body, follow_up_at: parsed.data.follow_up_at ? new Date(parsed.data.follow_up_at).toISOString() : null });
    (e.currentTarget as HTMLFormElement).reset();
    setTimeout(() => setSubmitting(false), 300);
  }
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <h2 className="font-display text-lg font-semibold">Notes & follow-ups</h2>
      <form onSubmit={handleAdd} className="mt-4 space-y-3">
        <Textarea name="body" placeholder="Add a note about this lead…" rows={3} required />
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 space-y-2 min-w-[200px]">
            <Label htmlFor="follow_up_at" className="text-xs">Follow-up (optional)</Label>
            <Input id="follow_up_at" name="follow_up_at" type="datetime-local" />
          </div>
          <Button type="submit" disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add note</Button>
        </div>
      </form>

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading notes…</div>
        ) : notes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            No notes yet.
          </div>
        ) : notes.map((n) => (
          <div key={n.id} className="group rounded-xl border border-border bg-background/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="whitespace-pre-wrap text-sm">{n.body}</p>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition" onClick={() => onDelete(n.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>{new Date(n.created_at).toLocaleString()}</span>
              {n.follow_up_at && (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-warning">
                  <CalendarClock className="h-3 w-3" /> Follow up {new Date(n.follow_up_at).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, name, type = "text", defaultValue }: { label: string; name: string; type?: string; defaultValue?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} />
    </div>
  );
}
