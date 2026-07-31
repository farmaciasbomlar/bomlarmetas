import React, { useState } from 'react';
import { Collaborator, GoalConfig, TeamRole } from '../types';
import { formatCurrency, formatPercent } from '../utils/calculations';
import { Users, Plus, Trash2, Calendar, Target, DollarSign, Percent, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

interface TeamAndGoalsTabProps {
  collaborators: Collaborator[];
  setCollaborators: React.Dispatch<React.SetStateAction<Collaborator[]>>;
  goalConfig: GoalConfig;
  setGoalConfig: React.Dispatch<React.SetStateAction<GoalConfig>>;
}

export const TeamAndGoalsTab: React.FC<TeamAndGoalsTabProps> = ({
  collaborators,
  setCollaborators,
  goalConfig,
  setGoalConfig,
}) => {
  // New collaborator form state
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<TeamRole>('Vendedor');
  const [newWeight, setNewWeight] = useState<number>(10);
  const [newTicket, setNewTicket] = useState<number>(54);

  // Calculate sum of seller weights
  const sellers = collaborators.filter((c) => c.isSeller);
  const nonSellers = collaborators.filter((c) => !c.isSeller);
  const totalSellerWeight = sellers.reduce((acc, curr) => acc + (curr.weightPercent || 0), 0);

  // Expected Pace
  const expectedPacePercent =
    goalConfig.totalBusinessDays > 0
      ? (goalConfig.elapsedDays / goalConfig.totalBusinessDays) * 100
      : 0;

  const handleAddCollaborator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const isSeller = newRole === 'Vendedor';
    const newCollab: Collaborator = {
      id: `collab-${Date.now()}`,
      code: newCode.trim() || `${Math.floor(100 + Math.random() * 900)}`,
      name: newName.trim().toUpperCase(),
      isSeller,
      role: newRole,
      weightPercent: isSeller ? newWeight : 0,
      ticketGoal: isSeller ? newTicket : 0,
    };

    setCollaborators([...collaborators, newCollab]);
    setNewCode('');
    setNewName('');
    setNewWeight(10);
  };

  const handleDeleteCollaborator = (id: string) => {
    setCollaborators(collaborators.filter((c) => c.id !== id));
  };

  const handleUpdateCollaborator = (id: string, fields: Partial<Collaborator>) => {
    setCollaborators(
      collaborators.map((c) => {
        if (c.id === id) {
          const updated = { ...c, ...fields };
          // If role changed to non-seller, zero out weight
          if (fields.role && fields.role !== 'Vendedor') {
            updated.isSeller = false;
            updated.weightPercent = 0;
            updated.ticketGoal = 0;
          } else if (fields.role === 'Vendedor') {
            updated.isSeller = true;
          }
          return updated;
        }
        return c;
      })
    );
  };

  return (
    <div className="space-[#1e2026] space-y-8 animate-fadeIn pb-12">
      {/* SECTION 1: Configuração das Metas do Mês */}
      <div className="bg-[#141519] border border-white/10 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-[#00b5ac]/20 border border-[#00b5ac]/40 flex items-center justify-center text-[#00b5ac]">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">1. Configuração da Meta Geral da Loja</h2>
            <p className="text-xs text-gray-400">Valores de referência da planilha da farmácia</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Mês */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Mês de Referência</label>
            <input
              type="text"
              value={goalConfig.monthName}
              onChange={(e) => setGoalConfig({ ...goalConfig, monthName: e.target.value })}
              className="w-full bg-[#1e2026] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#00b5ac]"
              placeholder="Ex: Julho"
            />
          </div>

          {/* Meta Geral (R$) */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Meta Geral da Loja (R$)</label>
            <div className="relative">
              <input
                type="number"
                step="1000"
                value={goalConfig.totalGoal}
                onChange={(e) => setGoalConfig({ ...goalConfig, totalGoal: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#1e2026] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#00b5ac] font-mono font-semibold"
              />
            </div>
            <span className="text-[10px] text-[#00b5ac] font-mono mt-1 block">
              {formatCurrency(goalConfig.totalGoal)}
            </span>
          </div>

          {/* Ticket Médio Vendedor */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Meta Ticket Vendedor (R$)</label>
            <input
              type="number"
              step="1"
              value={goalConfig.defaultSellerTicketGoal}
              onChange={(e) =>
                setGoalConfig({ ...goalConfig, defaultSellerTicketGoal: parseFloat(e.target.value) || 0 })
              }
              className="w-full bg-[#1e2026] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#00b5ac] font-mono"
            />
            <span className="text-[10px] text-gray-400 mt-1 block">Meta padrão para os vendedores</span>
          </div>

          {/* Ticket Médio Loja */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Meta Ticket Loja (R$)</label>
            <input
              type="number"
              step="1"
              value={goalConfig.storeTicketGoal}
              onChange={(e) => setGoalConfig({ ...goalConfig, storeTicketGoal: parseFloat(e.target.value) || 0 })}
              className="w-full bg-[#1e2026] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#00b5ac] font-mono"
            />
            <span className="text-[10px] text-gray-400 mt-1 block">Inclui balconistas e caixa</span>
          </div>

          {/* Dias Úteis Totais */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Dias Úteis Totais no Mês</label>
            <input
              type="number"
              min="1"
              max="31"
              value={goalConfig.totalBusinessDays}
              onChange={(e) =>
                setGoalConfig({ ...goalConfig, totalBusinessDays: parseInt(e.target.value) || 1 })
              }
              className="w-full bg-[#1e2026] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#00b5ac] font-mono"
            />
          </div>

          {/* Dias Decorridos */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Dias Decorridos Até Hoje</label>
            <input
              type="number"
              min="1"
              max={goalConfig.totalBusinessDays}
              value={goalConfig.elapsedDays}
              onChange={(e) => setGoalConfig({ ...goalConfig, elapsedDays: parseInt(e.target.value) || 1 })}
              className="w-full bg-[#1e2026] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#00b5ac] font-mono"
            />
          </div>

          {/* Card Indicador de Ritmo Esperado */}
          <div className="col-span-1 md:col-span-2 bg-gradient-to-r from-[#00b5ac]/15 to-[#008d86]/10 border border-[#00b5ac]/30 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calendar className="w-8 h-8 text-[#00b5ac]" />
              <div>
                <p className="text-xs text-gray-300">Ritmo Esperado no Dia {goalConfig.elapsedDays}:</p>
                <p className="text-xl font-extrabold text-white font-mono">{formatPercent(expectedPacePercent)}</p>
              </div>
            </div>
            <div className="text-right text-[11px] text-gray-300">
              <p>
                Fórmula da planilha: <br />
                <span className="font-mono text-[#00b5ac]">
                  ({goalConfig.elapsedDays} ÷ {goalConfig.totalBusinessDays}) × 100
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Cadastro e Distribuição de Vendedores */}
      <div className="bg-[#141519] border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#f36e21]/20 border border-[#f36e21]/40 flex items-center justify-center text-[#f36e21]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">2. Cadastro de Vendedores & Distribuição por %</h2>
              <p className="text-xs text-gray-400">
                Cada vendedor recebe um percentual da Meta Geral para cálculo automático em R$
              </p>
            </div>
          </div>

          {/* Total Percent Allocation Indicator */}
          <div
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-2xl border ${
              totalSellerWeight === 100
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : totalSellerWeight < 100
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {totalSellerWeight === 100 ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span className="text-xs font-semibold">
              Distribuição: {formatPercent(totalSellerWeight, 0)} / 100%
            </span>
          </div>
        </div>

        {/* Form Add New Collaborator */}
        <form onSubmit={handleAddCollaborator} className="bg-[#1a1b20] p-4 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-xs font-bold text-gray-200 flex items-center space-x-1.5">
            <Plus className="w-3.5 h-3.5 text-[#00b5ac]" />
            <span>Adicionar Novo Colaborador</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Código</label>
              <input
                type="text"
                placeholder="Ex: 727"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="w-full bg-[#121316] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00b5ac]"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-[11px] text-gray-400 mb-1">Nome Completo</label>
              <input
                type="text"
                placeholder="Ex: ANDRESSA"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-[#121316] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00b5ac]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Função</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as TeamRole)}
                className="w-full bg-[#121316] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00b5ac]"
              >
                <option value="Vendedor">Vendedor</option>
                <option value="Farmacêutico">Farmacêutico</option>
                <option value="Gerente">Gerente</option>
                <option value="Caixa">Caixa</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
            {newRole === 'Vendedor' && (
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Meta %</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={newWeight}
                  onChange={(e) => setNewWeight(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#121316] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00b5ac] font-mono"
                />
              </div>
            )}
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-[#f36e21] to-[#e05c10] hover:from-[#e05c10] hover:to-[#c84d07] text-white py-2 px-3 rounded-xl text-xs font-semibold shadow-md transition-all flex items-center justify-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar</span>
              </button>
            </div>
          </div>
        </form>

        {/* Sellers Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Vendedores ({sellers.length}) — Têm Meta Individual
          </h3>
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#121316]">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#1a1b20] text-[11px] uppercase tracking-wider text-gray-400 border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Cód.</th>
                  <th className="py-3 px-4">Nome do Vendedor</th>
                  <th className="py-3 px-4">Peso da Meta (%)</th>
                  <th className="py-3 px-4">Meta em R$ (Calculada)</th>
                  <th className="py-3 px-4">Meta Ticket (R$)</th>
                  <th className="py-3 px-4 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sellers.map((seller) => {
                  const targetR$ = goalConfig.totalGoal * ((seller.weightPercent || 0) / 100);
                  return (
                    <tr key={seller.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-mono text-gray-400">{seller.code}</td>
                      <td className="py-3 px-4 font-semibold text-white">{seller.name}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            step="1"
                            value={seller.weightPercent}
                            onChange={(e) =>
                              handleUpdateCollaborator(seller.id, {
                                weightPercent: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-16 bg-[#1e2026] border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono focus:border-[#00b5ac]"
                          />
                          <span className="text-gray-400">%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-[#00b5ac]">
                        {formatCurrency(targetR$)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1">
                          <span className="text-gray-400 text-[10px]">R$</span>
                          <input
                            type="number"
                            step="1"
                            value={seller.ticketGoal || goalConfig.defaultSellerTicketGoal}
                            onChange={(e) =>
                              handleUpdateCollaborator(seller.id, {
                                ticketGoal: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-16 bg-[#1e2026] border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono focus:border-[#00b5ac]"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDeleteCollaborator(seller.id)}
                          className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {sellers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-500 text-xs">
                      Nenhum vendedor cadastrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Non-Sellers Table */}
        <div className="space-y-3 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Não-Vendedores (Gerente, Farmacêutico, Caixa, Outros)</span>
            </h3>
            <span className="text-[11px] text-gray-400">
              Não têm metas individuais, mas suas vendas somam no faturamento da loja
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#121316]">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#1a1b20] text-[11px] uppercase tracking-wider text-gray-400 border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Cód.</th>
                  <th className="py-3 px-4">Nome</th>
                  <th className="py-3 px-4">Função</th>
                  <th className="py-3 px-4 text-right">Impacto nas Vendas</th>
                  <th className="py-3 px-4 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {nonSellers.map((ns) => (
                  <tr key={ns.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-mono text-gray-400">{ns.code}</td>
                    <td className="py-3 px-4 font-semibold text-white">{ns.name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] bg-white/5 border border-white/10 text-gray-300 font-medium">
                        {ns.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-[11px] text-gray-400">
                      Vendas computadas na Loja Geral ("Outros")
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeleteCollaborator(ns.id)}
                        className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {nonSellers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-gray-500 text-xs">
                      Nenhum não-vendedor registrado separadamente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
