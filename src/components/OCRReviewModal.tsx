import React, { useState, useEffect } from 'react';
import { OCRParseResult, OCRParsedRow, Collaborator, IndividualResult, StoreResult } from '../types';
import { formatCurrency, formatPercent } from '../utils/calculations';
import { CheckCircle2, AlertTriangle, Edit3, X, Sparkles, UserCheck, Calculator } from 'lucide-react';

interface OCRReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  ocrResult: OCRParseResult | null;
  collaborators: Collaborator[];
  onConfirm: (
    updatedIndividualResults: Record<string, IndividualResult>,
    updatedStoreResult: StoreResult
  ) => void;
}

export const OCRReviewModal: React.FC<OCRReviewModalProps> = ({
  isOpen,
  onClose,
  ocrResult,
  collaborators,
  onConfirm,
}) => {
  const [editedStoreTotal, setEditedStoreTotal] = useState<StoreResult>({
    netSales: 0,
    ticketMedio: 0,
    clientsCount: 0,
    itemsCount: 0,
    unitsCount: 0,
    discountPercent: 0,
  });

  const [editedRows, setEditedRows] = useState<OCRParsedRow[]>([]);

  // When modal opens or ocrResult changes, map and initialize state
  useEffect(() => {
    if (ocrResult) {
      setEditedStoreTotal({
        netSales: ocrResult.storeTotal?.netSales || 0,
        ticketMedio: ocrResult.storeTotal?.ticketMedio || 0,
        clientsCount: ocrResult.storeTotal?.clients || 0,
        itemsCount: ocrResult.storeTotal?.items || 0,
        unitsCount: ocrResult.storeTotal?.units || 0,
        discountPercent: ocrResult.storeTotal?.discountPercent || 0,
      });

      // Try auto matching by code or name
      const rowsMapped = (ocrResult.rows || []).map((row) => {
        const found = collaborators.find((c) => {
          const cleanCode = row.code?.replace(/\D/g, '');
          const cCode = c.code?.replace(/\D/g, '');
          if (cleanCode && cCode && cleanCode === cCode) return true;
          if (c.name && row.name && row.name.toUpperCase().includes(c.name.toUpperCase())) return true;
          return false;
        });

        return {
          ...row,
          matchedCollaboratorId: found ? found.id : '',
        };
      });

      setEditedRows(rowsMapped);
    }
  }, [ocrResult, collaborators]);

  if (!isOpen || !ocrResult) return null;

  const handleRowChange = (index: number, field: keyof OCRParsedRow, value: any) => {
    const updated = [...editedRows];
    updated[index] = { ...updated[index], [field]: value };
    setEditedRows(updated);
  };

  const handleConfirm = () => {
    const individualResults: Record<string, IndividualResult> = {};

    editedRows.forEach((row) => {
      if (row.matchedCollaboratorId) {
        individualResults[row.matchedCollaboratorId] = {
          collaboratorId: row.matchedCollaboratorId,
          netSales: row.netSales || 0,
          ticketMedio: row.ticketMedio || 0,
          clientsCount: row.clients || 0,
          itemsCount: row.items || 0,
          unitsCount: row.units || 0,
          grossSales: row.grossSales || 0,
          discountAmount: row.discountAmount || 0,
          discountPercent: row.discountPercent || 0,
        };
      }
    });

    onConfirm(individualResults, editedStoreTotal);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-[#141519] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#1a1c22]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f36e21] to-[#e05c10] flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">Revisão e Validação Humana dos Dados</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00b5ac]/20 text-[#00b5ac] border border-[#00b5ac]/30">
                  Validação Obrigatória
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Confira os valores extraídos do relatório (Imagem 2) antes de calcular o ritmo de metas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Warning notice */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-200">
              <span className="font-semibold">Atenção Gerente:</span> Associe cada colaborador do relatório a um
              integrante cadastrado da sua equipe e altere qualquer valor se houver divergência no OCR.
            </p>
          </div>

          {/* Store Total Review Block */}
          <div className="bg-[#1a1b20] p-4 rounded-2xl border border-white/10 space-y-3">
            <h3 className="text-xs font-bold text-[#00b5ac] uppercase tracking-wider flex items-center space-x-2">
              <Calculator className="w-4 h-4" />
              <span>Totais da Loja Extraídos</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">Venda Líquida (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editedStoreTotal.netSales}
                  onChange={(e) =>
                    setEditedStoreTotal({ ...editedStoreTotal, netSales: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-[#121316] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-[#00b5ac] font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 mb-1">Ticket Médio (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editedStoreTotal.ticketMedio}
                  onChange={(e) =>
                    setEditedStoreTotal({ ...editedStoreTotal, ticketMedio: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-[#121316] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 mb-1">Clientes</label>
                <input
                  type="number"
                  value={editedStoreTotal.clientsCount}
                  onChange={(e) =>
                    setEditedStoreTotal({ ...editedStoreTotal, clientsCount: parseInt(e.target.value) || 0 })
                  }
                  className="w-full bg-[#121316] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 mb-1">Itens</label>
                <input
                  type="number"
                  value={editedStoreTotal.itemsCount}
                  onChange={(e) =>
                    setEditedStoreTotal({ ...editedStoreTotal, itemsCount: parseInt(e.target.value) || 0 })
                  }
                  className="w-full bg-[#121316] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 mb-1">Unidades</label>
                <input
                  type="number"
                  value={editedStoreTotal.unitsCount}
                  onChange={(e) =>
                    setEditedStoreTotal({ ...editedStoreTotal, unitsCount: parseInt(e.target.value) || 0 })
                  }
                  className="w-full bg-[#121316] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 mb-1">% Desconto</label>
                <input
                  type="number"
                  step="0.01"
                  value={editedStoreTotal.discountPercent}
                  onChange={(e) =>
                    setEditedStoreTotal({ ...editedStoreTotal, discountPercent: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-[#121316] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-amber-400 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Collaborator Rows Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Linhas por Colaborador Encontradas ({editedRows.length})
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#121316]">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-[#1a1b20] text-[10px] uppercase tracking-wider text-gray-400 border-b border-white/10">
                  <tr>
                    <th className="py-2.5 px-3">Nome no Relatório</th>
                    <th className="py-2.5 px-3">Vincular a Equipe</th>
                    <th className="py-2.5 px-3">Venda Líquida (R$)</th>
                    <th className="py-2.5 px-3">Ticket Médio (R$)</th>
                    <th className="py-2.5 px-3">Clientes</th>
                    <th className="py-2.5 px-3">Itens</th>
                    <th className="py-2.5 px-3">% Desc.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {editedRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-semibold text-white whitespace-nowrap">
                        <span className="text-gray-500 mr-1.5">[{row.code}]</span>
                        {row.name}
                      </td>

                      {/* Map to Team Member */}
                      <td className="py-2.5 px-3 min-w-[180px]">
                        <select
                          value={row.matchedCollaboratorId || ''}
                          onChange={(e) => handleRowChange(idx, 'matchedCollaboratorId', e.target.value)}
                          className={`w-full bg-[#1e2026] border rounded-xl px-2.5 py-1.5 text-xs focus:outline-none ${
                            row.matchedCollaboratorId
                              ? 'border-[#00b5ac] text-[#00b5ac] font-semibold'
                              : 'border-amber-500/50 text-amber-400'
                          }`}
                        >
                          <option value="">-- Selecione o Vendedor --</option>
                          {collaborators.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.code ? `[${c.code}] ` : ''}
                              {c.name} ({c.role})
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Venda Líquida */}
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          step="0.01"
                          value={row.netSales}
                          onChange={(e) => handleRowChange(idx, 'netSales', parseFloat(e.target.value) || 0)}
                          className="w-24 bg-[#1e2026] border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono font-semibold focus:border-[#00b5ac]"
                        />
                      </td>

                      {/* Ticket Médio */}
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          step="0.01"
                          value={row.ticketMedio}
                          onChange={(e) => handleRowChange(idx, 'ticketMedio', parseFloat(e.target.value) || 0)}
                          className="w-20 bg-[#1e2026] border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono focus:border-[#00b5ac]"
                        />
                      </td>

                      {/* Clientes */}
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          value={row.clients}
                          onChange={(e) => handleRowChange(idx, 'clients', parseInt(e.target.value) || 0)}
                          className="w-16 bg-[#1e2026] border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono focus:border-[#00b5ac]"
                        />
                      </td>

                      {/* Itens */}
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          value={row.items}
                          onChange={(e) => handleRowChange(idx, 'items', parseInt(e.target.value) || 0)}
                          className="w-16 bg-[#1e2026] border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono focus:border-[#00b5ac]"
                        />
                      </td>

                      {/* % Desconto */}
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          step="0.01"
                          value={row.discountPercent}
                          onChange={(e) => handleRowChange(idx, 'discountPercent', parseFloat(e.target.value) || 0)}
                          className="w-16 bg-[#1e2026] border border-white/10 rounded-lg px-2 py-1 text-xs text-amber-400 font-mono focus:border-[#00b5ac]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/10 bg-[#1a1c22] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            Cancelar
          </button>

          <button
            onClick={handleConfirm}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00b5ac] to-[#008d86] hover:from-[#00a29a] hover:to-[#007b75] text-white text-xs font-semibold shadow-lg shadow-[#00b5ac]/20 transition-all flex items-center space-x-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirmar e Calcular Resultados</span>
          </button>
        </div>
      </div>
    </div>
  );
};
