import React, { useState } from 'react';
import { Collaborator, IndividualResult, StoreResult, OCRParseResult } from '../types';
import { formatCurrency } from '../utils/calculations';
import { OCRReviewModal } from './OCRReviewModal';
import { Camera, Edit3, Upload, Loader2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ResultsEntryTabProps {
  collaborators: Collaborator[];
  individualResults: Record<string, IndividualResult>;
  setIndividualResults: React.Dispatch<React.SetStateAction<Record<string, IndividualResult>>>;
  storeResult: StoreResult;
  setStoreResult: React.Dispatch<React.SetStateAction<StoreResult>>;
  onAfterConfirmResults?: () => void;
}

export const ResultsEntryTab: React.FC<ResultsEntryTabProps> = ({
  collaborators,
  individualResults,
  setIndividualResults,
  storeResult,
  setStoreResult,
  onAfterConfirmResults,
}) => {
  const [entryMode, setEntryMode] = useState<'ocr' | 'manual'>('ocr');
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrResultData, setOcrResultData] = useState<OCRParseResult | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Handle OCR Image File Upload
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setIsProcessingOCR(true);
    setOcrError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        setImagePreview(base64Data);

        const response = await fetch('/api/ocr-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: file.type || 'image/jpeg',
          }),
        });

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          throw new Error(errJson.error || 'Erro ao processar imagem do relatório via OCR.');
        }

        const data: OCRParseResult = await response.json();
        setOcrResultData(data);
        setIsReviewModalOpen(true);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setOcrError(err.message || 'Falha no processamento OCR. Tente novamente ou use a entrada manual.');
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const handleManualIndividualChange = (
    collaboratorId: string,
    field: keyof IndividualResult,
    value: number
  ) => {
    const existing = individualResults[collaboratorId] || {
      collaboratorId,
      netSales: 0,
      ticketMedio: 0,
      clientsCount: 0,
      itemsCount: 0,
      unitsCount: 0,
    };

    setIndividualResults({
      ...individualResults,
      [collaboratorId]: {
        ...existing,
        [field]: value,
      },
    });
  };

  const handleManualStoreChange = (field: keyof StoreResult, value: number) => {
    setStoreResult({
      ...storeResult,
      [field]: value,
    });
  };

  const handleConfirmOCRData = (
    updatedIndividualResults: Record<string, IndividualResult>,
    updatedStoreResult: StoreResult
  ) => {
    setIndividualResults({ ...individualResults, ...updatedIndividualResults });
    setStoreResult(updatedStoreResult);
    setIsReviewModalOpen(false);

    if (onAfterConfirmResults) {
      onAfterConfirmResults();
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Mode Switcher */}
      <div className="bg-[#141519] border border-white/10 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-base font-bold text-white">Lançamento de Resultados do Dia</h2>
            <p className="text-xs text-gray-400">Escolha o método para atualizar as vendas da farmácia</p>
          </div>

          <div className="flex items-center space-x-2 bg-[#1e2026] p-1.5 rounded-2xl border border-white/5">
            <button
              onClick={() => setEntryMode('ocr')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                entryMode === 'ocr'
                  ? 'bg-gradient-to-r from-[#00b5ac] to-[#008d86] text-white shadow-md shadow-[#00b5ac]/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Por Imagem (OCR AI)</span>
            </button>

            <button
              onClick={() => setEntryMode('manual')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                entryMode === 'manual'
                  ? 'bg-gradient-to-r from-[#f36e21] to-[#e05c10] text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Lançamento Manual</span>
            </button>
          </div>
        </div>

        {/* MODE 1: OCR IMAGE UPLOAD */}
        {entryMode === 'ocr' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-[#1e2026] border border-white/5 flex items-start space-x-3">
              <Sparkles className="w-5 h-5 text-[#00b5ac] shrink-0 mt-0.5" />
              <div className="text-xs text-gray-300 leading-relaxed">
                <span className="font-semibold text-white">Leitura Inteligente via Imagem 2:</span> Envie a foto do
                relatório <span className="text-[#00b5ac] font-mono">"Resumo de Desempenho por Colaborador (802)"</span>. O Gemini
                fará o OCR de todas as colunas. <br />
                <span className="text-[#f36e21] font-semibold">Validação Obrigatória:</span> Uma tela de revisão será
                exibida para você confirmar os valores antes de calcular.
              </div>
            </div>

            {/* Dropzone */}
            <div className="relative border-2 border-dashed border-white/20 hover:border-[#00b5ac]/60 rounded-3xl p-8 text-center transition-all bg-[#121316] group cursor-pointer">
              <input
                type="file"
                accept="image/*"
                disabled={isProcessingOCR}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />

              <div className="flex flex-col items-center justify-center space-y-3">
                {isProcessingOCR ? (
                  <div className="flex flex-col items-center space-y-3">
                    <Loader2 className="w-10 h-10 text-[#00b5ac] animate-spin" />
                    <p className="text-sm font-bold text-white">Lendo Relatório 802 com Inteligência Artificial...</p>
                    <p className="text-xs text-gray-400">Extraindo Venda Líquida, Ticket Médio, Clientes e Descontos</p>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-[#00b5ac]/10 border border-[#00b5ac]/30 flex items-center justify-center text-[#00b5ac] group-hover:scale-110 transition-transform">
                      <Upload className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Clique ou arraste a imagem do relatório aqui</p>
                      <p className="text-xs text-gray-400 mt-1">Suporta JPG, PNG ou prints de tela da farmácia</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {ocrError && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-3 text-rose-400 text-xs">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{ocrError}</span>
              </div>
            )}

            {imagePreview && !isProcessingOCR && (
              <div className="p-4 rounded-2xl bg-[#1e2026] border border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img src={imagePreview} alt="Preview do Relatório" className="w-12 h-12 rounded-xl object-cover border border-white/20" />
                  <div>
                    <p className="text-xs font-bold text-white">Imagem do Relatório Carregada</p>
                    <p className="text-[11px] text-[#00b5ac]">Pronta para revisão e validação</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsReviewModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#00b5ac] hover:bg-[#009b93] text-white text-xs font-semibold shadow-md transition-all flex items-center space-x-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Abrir Tela de Validação Humana</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* MODE 2: MANUAL ENTRY */}
        {entryMode === 'manual' && (
          <div className="space-y-6">
            {/* Store Total Entry */}
            <div className="bg-[#1a1b20] p-5 rounded-2xl border border-white/10 space-y-3">
              <h3 className="text-xs font-bold text-[#00b5ac] uppercase tracking-wider">Total Geral da Loja</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Venda Líquida (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={storeResult.netSales}
                    onChange={(e) => handleManualStoreChange('netSales', parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#121316] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#00b5ac] font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Ticket Médio (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={storeResult.ticketMedio}
                    onChange={(e) => handleManualStoreChange('ticketMedio', parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#121316] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Clientes</label>
                  <input
                    type="number"
                    value={storeResult.clientsCount}
                    onChange={(e) => handleManualStoreChange('clientsCount', parseInt(e.target.value) || 0)}
                    className="w-full bg-[#121316] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Itens</label>
                  <input
                    type="number"
                    value={storeResult.itemsCount}
                    onChange={(e) => handleManualStoreChange('itemsCount', parseInt(e.target.value) || 0)}
                    className="w-full bg-[#121316] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Unidades</label>
                  <input
                    type="number"
                    value={storeResult.unitsCount}
                    onChange={(e) => handleManualStoreChange('unitsCount', parseInt(e.target.value) || 0)}
                    className="w-full bg-[#121316] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">% Desconto</label>
                  <input
                    type="number"
                    step="0.01"
                    value={storeResult.discountPercent || 0}
                    onChange={(e) => handleManualStoreChange('discountPercent', parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#121316] border border-white/10 rounded-xl px-3 py-2 text-xs text-amber-400 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Individual Collaborator Entry Table */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Resultados Individuais por Colaborador
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#121316]">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#1a1b20] text-[10px] uppercase tracking-wider text-gray-400 border-b border-white/10">
                    <tr>
                      <th className="py-2.5 px-3">Cód.</th>
                      <th className="py-2.5 px-3">Nome</th>
                      <th className="py-2.5 px-3">Função</th>
                      <th className="py-2.5 px-3">Venda Líquida (R$)</th>
                      <th className="py-2.5 px-3">Ticket Médio (R$)</th>
                      <th className="py-2.5 px-3">Clientes</th>
                      <th className="py-2.5 px-3">Itens</th>
                      <th className="py-2.5 px-3">% Desconto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {collaborators.map((collab) => {
                      const res = individualResults[collab.id] || {
                        collaboratorId: collab.id,
                        netSales: 0,
                        ticketMedio: 0,
                        clientsCount: 0,
                        itemsCount: 0,
                        unitsCount: 0,
                        discountPercent: 0,
                      };

                      return (
                        <tr key={collab.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-gray-400">{collab.code}</td>
                          <td className="py-2.5 px-3 font-semibold text-white">{collab.name}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 border border-white/10 text-gray-300">
                              {collab.role}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              step="0.01"
                              value={res.netSales}
                              onChange={(e) =>
                                handleManualIndividualChange(collab.id, 'netSales', parseFloat(e.target.value) || 0)
                              }
                              className="w-24 bg-[#1e2026] border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono font-semibold focus:border-[#00b5ac]"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              step="0.01"
                              value={res.ticketMedio}
                              onChange={(e) =>
                                handleManualIndividualChange(collab.id, 'ticketMedio', parseFloat(e.target.value) || 0)
                              }
                              className="w-20 bg-[#1e2026] border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono focus:border-[#00b5ac]"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              value={res.clientsCount}
                              onChange={(e) =>
                                handleManualIndividualChange(collab.id, 'clientsCount', parseInt(e.target.value) || 0)
                              }
                              className="w-16 bg-[#1e2026] border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono focus:border-[#00b5ac]"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              value={res.itemsCount}
                              onChange={(e) =>
                                handleManualIndividualChange(collab.id, 'itemsCount', parseInt(e.target.value) || 0)
                              }
                              className="w-16 bg-[#1e2026] border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono focus:border-[#00b5ac]"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              step="0.01"
                              value={res.discountPercent || 0}
                              onChange={(e) =>
                                handleManualIndividualChange(collab.id, 'discountPercent', parseFloat(e.target.value) || 0)
                              }
                              className="w-16 bg-[#1e2026] border border-white/10 rounded-lg px-2 py-1 text-xs text-amber-400 font-mono focus:border-[#00b5ac]"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => {
                  if (onAfterConfirmResults) onAfterConfirmResults();
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00b5ac] to-[#008d86] text-white text-xs font-semibold shadow-lg shadow-[#00b5ac]/20 flex items-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar e Atualizar Painel</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* OCR Mandatory Review Modal */}
      <OCRReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        ocrResult={ocrResultData}
        collaborators={collaborators}
        onConfirm={handleConfirmOCRData}
      />
    </div>
  );
};
