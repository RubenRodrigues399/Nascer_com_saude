"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { generateAssentoPDF } from "@/utils/pdfGenerator";
import { logAction } from "@/utils/audit";

export default function RecordsPanel() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");

  // US-10: Query reativa ao IndexedDB que faz a pesquisa offline
  const records = useLiveQuery(async () => {
    let collection = db.records.orderBy("createdAt").reverse();

    // Se houver termo de pesquisa, filtramos (Pesquisa parcial - US-10)
    if (searchTerm.trim() !== "") {
      const lowerSearch = searchTerm.toLowerCase();
      return await collection
        .filter(
          (record) =>
            record.nomeMae.toLowerCase().includes(lowerSearch) ||
            record.nomeCrianca.toLowerCase().includes(lowerSearch) ||
            record.dataNascimento.includes(lowerSearch)
        )
        .toArray();
    }

    // Filtro por estado na UI (Pendente / Sincronizado / Erro)
    if (filterStatus !== "todos") {
      return await db.records.where("status").equals(filterStatus).toArray();
    }

    return await collection.toArray();
  }, [searchTerm, filterStatus]);

  // Função auxiliar para renderizar as badges de estado (US-09)
  const renderStatusBadge = (status: "pendente" | "sincronizado" | "erro") => {
    switch (status) {
      case "sincronizado":
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
            Sincronizado
          </span>
        );
      case "erro":
        return (
          <span
            className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800"
            title="Erro ao enviar ao servidor central. Verifique a rede."
          >
            Erro
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
            Pendente de Envio
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-xl shadow-md border border-slate-200 p-6 mt-8">
      <div className="sm:flex sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Painel de Controlo de Registos
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Histórico local de nascimentos nesta unidade sanitária.
          </p>
        </div>
      </div>

      {/* Barra de Filtros e Pesquisa (US-10) */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="sr-only">Pesquisar</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Pesquisar por nome da mãe, da criança ou data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-700"
          >
            <option value="todos">Todos os Estados</option>
            <option value="pendente">Pendentes</option>
            <option value="sincronizado">Sincronizados</option>
            <option value="erro">Com Erro</option>
          </select>
        </div>
      </div>

      {/* Tabela de Dados Responsiva (US-09 & US-11) */}
      <div className="mt-6 overflow-x-auto border border-slate-100 rounded-lg">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Criança / Cód. Registo</th>
              <th className="px-4 py-3">Mãe (BI)</th>
              <th className="px-4 py-3">Pai (BI)</th>
              <th className="px-4 py-3">Data Criado</th>
              <th className="px-4 py-3 text-center">Estado</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {records && records.length > 0 ? (
              records.map((record) => (
                <tr
                  key={record.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">
                      {record.nomeCrianca}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{record.nomeMae}</div>
                    <div className="text-xs text-slate-500 font-mono">
                      {record.biMae}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{record.nomePai || "Não Declarado"}</div>
                    <div className="text-xs text-slate-500 font-mono">
                      {record.biPai || "Não Declarado"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(record.createdAt).toLocaleDateString("pt-AO")}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {renderStatusBadge(record.status)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={async () => {
                        try {
                          // 1. Grava o log de auditoria na base de dados local
                          await logAction(
                            "Reimpressão de PDF",
                            `Segunda via do Assento ID: ${record.id} emitida para a criança ${record.nomeCrianca}.`
                          );
                        } catch (err) {
                          console.error(
                            "Erro ao gravar log de auditoria:",
                            err
                          );
                        }

                        // 2. Dispara a geração e abertura do PDF
                        generateAssentoPDF({
                          id: record.id!,
                          nomeCrianca: record.nomeCrianca,
                          dataNascimento: record.dataNascimento,
                          horaNascimento: record.horaNascimento,
                          sexo: record.sexo,
                          nomeMae: record.nomeMae,
                          biMae: record.biMae,
                          nomePai: record.nomePai,
                          biPai: record.biPai,
                          naturalDe: record.naturalDe,
                          municipio: record.municipio,
                          provincia: record.provincia,
                        });
                      }}
                      className="text-blue-600 hover:text-blue-800 text-xs font-bold bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded transition-colors"
                    >
                      Reimprimir
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-10 text-slate-400 font-medium"
                >
                  Nenhum registo encontrado localmente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
