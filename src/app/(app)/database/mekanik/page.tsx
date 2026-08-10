"use client";

import CrudTable from "@/components/crud-table";
import { UserCog } from "lucide-react";

export default function MekanikPage() {
  return (
    <CrudTable
      tableName="mechanics"
      title="Database Mekanik"
      itemLabel="Mekanik"
      icon={UserCog}
      columns={[
        { key: "nama", label: "Nama Mekanik", required: true },
        { key: "no_hp", label: "No HP" },
      ]}
      searchKeys={["nama", "no_hp"]}
      importColumns={[
        { key: "nama", label: "Nama" },
        { key: "no_hp", label: "No HP" },
      ]}
      uniqueKey="nama"
      orderBy="nama"
      sampleRow={{ Nama: "Joko Susilo", "No HP": "081355577788" }}
    />
  );
}
