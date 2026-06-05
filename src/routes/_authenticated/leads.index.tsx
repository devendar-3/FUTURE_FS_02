import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, Trash2, ExternalLink, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/leads/")({
  head: () => ({ meta: [{ title: "Leads — Nexus CRM" }] }),
  component: LeadsPage,
});

type LeadStatus = "new" | "contacted" | "converted";
type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  source: string | null;
  status: LeadStatus;
  created_at: string;
};

const statusStyles: Record<LeadStatus, string> = {
  new: "bg-primary/15 text-primary border-primary/30",
  contacted: "bg-warning/15 text-warning border-warning/30",
  converted: "bg-success/15 text-success border-success/30",
};

const leadSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  source: z.string().trim().max(80).optional().or(z.literal("")),
  status: z.enum(["new", "contacted", "converted"]),
});

function LeadsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | LeadStatus>("all");
  const [open, setOpen] = useState(false);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id,name,email,phone,source,status,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["leads"] }); toast.success("Status updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["leads"] }); toast.success("Lead deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = leads.filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || (l.source?.toLowerCase().includes(q) ?? false);
    }
    return true;
  });

  const counts = {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    converted: leads.filter((l) => l.status === "converted").length,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track everyone in your pipeline.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New lead</Button>
          </DialogTrigger>
          <NewLeadDialog onClose={() => setOpen(false)} />
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={counts.total} />
        <StatCard label="New" value={counts.new} tone="primary" />
        <StatCard label="Contacted" value={counts.contacted} tone="warning" />
        <StatCard label="Converted" value={counts.converted} tone="success" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name, email, source…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading leads…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            {leads.length === 0 ? "No leads yet — add your first one." : "No leads match your filters."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Source</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium">
                      <Link to="/leads/$id" params={{ id: lead.id }} className="hover:text-primary">
                        {lead.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{lead.email}</td>
                    <td className="px-5 py-3 text-muted-foreground">{lead.source || "—"}</td>
                    <td className="px-5 py-3">
                      <Select value={lead.status} onValueChange={(v) => updateStatus.mutate({ id: lead.id, status: v as LeadStatus })}>
                        <SelectTrigger className={`w-[140px] border ${statusStyles[lead.status]}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="converted">Converted</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{new Date(lead.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link to="/leads/$id" params={{ id: lead.id }}>
                          <Button size="icon" variant="ghost"><ExternalLink className="h-4 w-4" /></Button>
                        </Link>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Delete lead "${lead.name}"?`)) deleteLead.mutate(lead.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "primary" | "warning" | "success" }) {
  const toneClass =
    tone === "primary" ? "text-primary" :
    tone === "warning" ? "text-warning" :
    tone === "success" ? "text-success" : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 font-display text-3xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function NewLeadDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<LeadStatus>("new");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = leadSchema.safeParse({
      name: fd.get("name"), email: fd.get("email"),
      phone: fd.get("phone") || "", source: fd.get("source") || "",
      status,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSubmitting(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("leads").insert({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      source: parsed.data.source || null,
      status: parsed.data.status,
      created_by: userData.user?.id,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Lead added");
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    onClose();
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>New lead</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" name="name" required />
          <Field label="Email" name="email" type="email" required />
          <Field label="Phone" name="phone" />
          <Field label="Source" name="source" placeholder="Website, Referral…" />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add lead
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function Field({ label, name, type = "text", required, placeholder }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}{required && <span className="text-destructive"> *</span>}</Label>
      <Input id={name} name={name} type={type} required={required} placeholder={placeholder} />
    </div>
  );
}

// Used Badge import to avoid TS warning if needed
void Badge;
