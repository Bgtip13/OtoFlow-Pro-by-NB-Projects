"use client";

import CrudTable from "@/components/crud-table";
import { Users } from "lucide-react";

export default function PelangganPenjualanPage() {
  return (
    <CrudTable
      tableName="sales_customers"
      title="Database Pelanggan Penjualan"
      itemLabel="Pelanggan"
      icon={Users}
      columns={[
        { key: "nama", label: "Nama Pelanggan", required: true },
        { key: "no_hp", label: "No HP" },
        { key: "alamat", label: "Alamat" },
      ]}
      searchKeys={["nama", "no_hp"]}
      importColumns={[
        { key: "nama", label: "Nama" },
        { key: "no_hp", label: "No HP" },
        { key: "alamat", label: "Alamat" },
      ]}
      uniqueKey="nama"
      orderBy="nama"
      sampleRow={{ Nama: "Budi Santoso", "No HP": "081234567890", Alamat: "Jl. Merdeka No.1" }}
    />
  );
}
