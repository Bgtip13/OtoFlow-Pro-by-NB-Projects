"use client";

import CrudTable from "@/components/crud-table";
import { Bike } from "lucide-react";

export default function PelangganServisPage() {
  return (
    <CrudTable
      tableName="service_customers"
      title="Database Pelanggan Servis"
      itemLabel="Pelanggan"
      icon={Bike}
      columns={[
        { key: "nama", label: "Nama Pelanggan", required: true },
        { key: "no_hp", label: "No HP" },
        { key: "alamat", label: "Alamat" },
        { key: "jenis_motor", label: "Jenis Motor" },
        { key: "plat_nomor", label: "Plat Nomor" },
      ]}
      searchKeys={["nama", "no_hp", "plat_nomor"]}
      importColumns={[
        { key: "nama", label: "Nama" },
        { key: "no_hp", label: "No HP" },
        { key: "alamat", label: "Alamat" },
        { key: "jenis_motor", label: "Jenis Motor" },
        { key: "plat_nomor", label: "Plat Nomor" },
      ]}
      uniqueKey="nama"
      orderBy="nama"
      sampleRow={{
        Nama: "Andi Wijaya",
        "No HP": "081298765432",
        Alamat: "Jl. Sudirman No.5",
        "Jenis Motor": "Honda Vario 125",
        "Plat Nomor": "B 1234 ABC",
      }}
    />
  );
}
