"use client";

import CrudTable from "@/components/crud-table";
import { Truck } from "lucide-react";

export default function SupplierPage() {
  return (
    <CrudTable
      tableName="suppliers"
      title="Database Supplier"
      itemLabel="Supplier"
      icon={Truck}
      columns={[
        { key: "nama", label: "Nama Supplier", required: true },
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
      sampleRow={{ Nama: "PT Sumber Sparepart", "No HP": "0215551234", Alamat: "Jakarta" }}
    />
  );
}
