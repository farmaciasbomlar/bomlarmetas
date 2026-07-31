import React from 'react';
import { X, CheckCircle2, Camera, Calculator, Users, Trophy, Sparkles, FileSpreadsheet, AlertTriangle } from 'lucide-react';

interface UsageGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartWorkflow?: () => void;
}

export const UsageGuideModal: React.FC<UsageGuideModalProps> = ({ isOpen, onClose, onStartWorkflow }) => {
  if (!isOpen) return null;

  const steps = [
    {
      number: '1',
      title: 'Cadastrar Equipe e Configurar Metas do Mês',
      icon: Users,
      badge: 'Passo 1',
      color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
      description:
        'Acesse a aba "Equipe & Metas" para cadastrar vendedores (com código e % de peso na meta) e não-vendedores (gerente, farmacêutico, caixa). Configure a Meta Geral do Mês em R$, dias úteis totais e dias decorridos.',
      details: [
        'Vendedores recebem cálculo individual de meta e ritmo diário.',
        'Não-vendedores não têm meta individual, mas suas vendas contam para o faturamento total da loja.',
        'O ritmo esperado do mês é calculado automaticamente: (Dias Decorridos ÷ Dias Totais) × 100.',
      ],
    },
    {
      number: '2',
      title: 'Lançar Resultados (Upload do Relatório por Imagem / OCR ou Manual)',
      icon: Camera,
      badge: 'Passo 2',
      color: 'from-[#00b5ac]/20 to-[#00b5ac]/10 border-[#00b5ac]/30 text-[#00b5ac]',
      description:
        'Tire uma foto/print do relatório da farmácia "Resumo de Desempenho por Colaborador (802)" e envie em "Lançar Resultados". A IA Gemini lê automaticamente faturamento, ticket médio, clientes, itens e descontos.',
      details: [
        'A IA faz o OCR inteligente identificando cada colaborador e a linha de Total Geral.',
        'Ou escolha o Lançamento Manual caso prefira digitar diretamente.',
      ],
    },
    {
      number: '3',
      title: 'Validação Humana Obrigatória dos Dados Extraídos',
      icon: CheckCircle2,
      badge: 'Passo 3',
      color: 'from-[#f36e21]/20 to-[#f36e21]/10 border-[#f36e21]/30 text-[#f36e21]',
      description:
        'O aplicativo OBRIGATORIAMENTE abre uma tela de revisão. Você (Gerente) confere e ajusta qualquer número lido antes de calcular.',
      details: [
        'Mapeie linhas extraídas para colaboradores cadastrados.',
        'Corrija eventuais falhas de leitura de foto desfocada.',
        'Garante 100% de precisão nos cálculos da farmácia.',
      ],
    },
    {
      number: '4',
      title: 'Acompanhar Painéis, Diagnóstico IA e Exportar Card do Vendedor em PDF',
      icon: Trophy,
      badge: 'Passo 4',
      color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
      description:
        'Visualize o Painel Geral da Loja com o Semáforo de Performance, acesse a Apresentação Gamificada do Vendedor com anel de progresso e gere análises inteligentes com scripts de feedback para 1-on-1.',
      details: [
        'Análise cruzada: Ticket Médio × Clientes × Itens (Identifica se o problema é Fluxo, Venda Adicional ou Margem).',
        'Botão para exportar o Card de Apresentação em PDF para entregar ao vendedor ou postar no grupo.',
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#141519] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#1a1c22]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#00b5ac]/20 border border-[#00b5ac]/40 flex items-center justify-center text-[#00b5ac]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Roteiro de Uso Passo a Passo</h2>
              <p className="text-xs text-gray-400">Guia de gestão diária de metas na farmácia</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Concept Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#00b5ac]/10 via-transparent to-[#f36e21]/10 border border-white/10">
            <div className="flex items-start space-x-3">
              <FileSpreadsheet className="w-5 h-5 text-[#00b5ac] shrink-0 mt-0.5" />
              <div className="text-xs text-gray-300 leading-relaxed">
                <span className="font-semibold text-white">Fórmulas e Lógica de Planilha em Tempo Real:</span> As
                metas individuais são distribuídas por % sobre a Meta Geral. O faturamento da loja inclui não-vendedores
                (farmacêutico, caixa, gerente), permitindo análises separadas e precisas.
              </div>
            </div>
          </div>

          {/* Steps list */}
          <div className="space-y-4">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.number}
                  className="p-5 rounded-2xl bg-[#1a1b20] border border-white/5 hover:border-white/10 transition-all"
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center font-bold text-white shrink-0 text-sm">
                      {step.number}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                          <Icon className="w-4 h-4 text-[#00b5ac]" />
                          <span>{step.title}</span>
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${step.color}`}>
                          {step.badge}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed">{step.description}</p>
                      <ul className="space-y-1 pt-1">
                        {step.details.map((detail, idx) => (
                          <li key={idx} className="text-[11px] text-gray-400 flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00b5ac]/60"></span>
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-white/10 bg-[#1a1c22] flex items-center justify-between">
          <p className="text-xs text-gray-400">Entendido o fluxo de trabalho?</p>
          <button
            onClick={() => {
              onClose();
              if (onStartWorkflow) onStartWorkflow();
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00b5ac] to-[#008d86] hover:from-[#00a29a] hover:to-[#007b75] text-white text-xs font-semibold shadow-lg shadow-[#00b5ac]/20 transition-all flex items-center space-x-2"
          >
            <span>Iniciar Gestão de Metas</span>
            <CheckCircle2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
