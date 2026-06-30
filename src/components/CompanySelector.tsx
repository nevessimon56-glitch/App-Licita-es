"use client";

import { Building2 } from "lucide-react";
import { COMPANY_PROFILES } from "@/lib/company-defaults";
import type { CompanyProfile } from "@/lib/proposal-types";

interface Props {
  selectedId: string;
  onSelect: (company: CompanyProfile) => void;
}

export function CompanySelector({ selectedId, onSelect }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Building2 className="w-4 h-4 text-blue-700" />
        Empresa para a proposta
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {COMPANY_PROFILES.map((company) => {
          const selected = company.id === selectedId;
          return (
            <button
              key={company.id}
              type="button"
              onClick={() => onSelect(company)}
              className={`text-left rounded-xl border p-4 transition-colors ${
                selected
                  ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <p className="font-semibold text-slate-800 text-sm">
                {company.nomeFantasia}
              </p>
              <p className="text-xs text-slate-600 mt-1">{company.razaoSocial}</p>
              <p className="text-xs text-slate-500 mt-2 font-mono">
                CNPJ {company.cnpj}
              </p>
              <p className="text-xs text-slate-500">
                {company.municipio}-{company.estado}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
