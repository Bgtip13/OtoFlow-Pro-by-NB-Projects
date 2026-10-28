"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";
import { useToast } from "@/components/toast";
import PageHeader from "@/components/page-header";
import { FilterBar } from "@/components/filter-bar";
import {
  Badge,
  Button,
  DataTable,
  Input,
  Pagination,
  StatCard,
  type TableColumn,
} from "@/components/ui";
import { BadgeCheck, Dices, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { RowAction, RowActions } from "@/components/ui";

const PAGE_SIZE = 20;

type Code = {
  id: string;
  code: string;
  used: boolean;
  used_at: string | null;
  created_at: string;
};

function randomCode() {
  const part = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  return `OTOF-${part()}-${part()}`;
}

export default function AdminAktivasiPage() {
  const supabase = createClient();
  const toast = useToast();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Code[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      setAllowed(profile?.role === "admin");
      load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    const { data, count } = await supabase
      .from("activation_codes")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (data) {
      setRows(data as Code[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }

  async function handleCreate() {
    const code = newCode.trim().toUpperCase();
    if (!code) {
      toast.error("Kode aktivasi tidak boleh kosong.");
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("activation_codes").insert({ code });
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Kode ${code} berhasil dibuat.`);
    setNewCode("");
    setPage(0);
    load();
  }

  async function handleDelete(c: Code) {
    if (c.used) {
      if (!confirm(`Kode ${c.code} SUDAH DIPAKAI. Hapus tetap?`)) return;
    } else if (!confirm(`Hapus kode ${c.code}?`)) return;

    const { error } = await supabase.from("activation_codes").delete().eq("id", c.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Kode dihapus.");
    load();
  }

  if (allowed === null) {
    return (
      <div className="animate-fade-in">
        <div className="skeleton h-11 w-11 rounded-2xl" />
        <div className="mt-4 skeleton h-40 rounded-2xl" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-center text-sm font-medium text-red-600">
          Akses ditolak. Halaman khusus admin.
        </div>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const aktif = rows.filter((r) => !r.used).length;

  const columns: TableColumn<Code>[] = [
    { key: "code", header: "Kode", render: (c) => <span className="font-mono text-xs font-bold text-slate-800">{c.code}</span> },
    {
      key: "status",
      header: "Status",
      render: (c) => (c.used ? <Badge tone="slate">Dipakai</Badge> : <Badge tone="green">Aktif</Badge>),
    },
    { key: "created_at", header: "Dibuat", render: (c) => <span className="text-slate-500">{formatDate(c.created_at)}</span> },
    { key: "used_at", header: "Dipakai", render: (c) => <span className="text-slate-500">{c.used_at ? formatDate(c.used_at) : "-"}</span> },
    {
      key: "__aksi",
      header: "Aksi",
      align: "right",
      headerClassName: "text-right",
      render: (c) => (
        <RowActions>
          <RowAction icon={Trash2} tone="red" onClick={() => handleDelete(c)}>
            Hapus
          </RowAction>
        </RowActions>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        icon={ShieldCheck}
        title="Panel Admin — Kode Aktivasi"
        subtitle={`${total} kode · setiap kode dipakai 1x untuk registrasi`}
        badge={<Badge tone="blue">Admin</Badge>}
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Kode" value={total} icon={ShieldCheck} tone="blue" />
        <StatCard label="Kode Aktif" value={aktif} icon={BadgeCheck} tone="green" hint="Di halaman ini" />
      </div>

      <FilterBar>
        <Input
          value={newCode}
          onChange={(e) => setNewCode(e.target.value.toUpperCase())}
          placeholder="Ketik kode atau klik Generate"
          className="w-full font-mono uppercase sm:w-72"
        />
        <Button icon={Dices} size="md" onClick={() => setNewCode(randomCode())}>
          Generate
        </Button>
        <Button icon={Plus} variant="primary" onClick={handleCreate} loading={creating}>
          {creating ? "Membuat..." : "Buat Kode"}
        </Button>
      </FilterBar>

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(c) => c.id}
          loading={loading}
          empty="Belum ada kode aktivasi."
          emptyIcon={ShieldCheck}
          footer={<Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />}
        />
      </div>
    </div>
  );
}
