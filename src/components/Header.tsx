import React from 'react';
import { Pill, Sparkles, BookOpen, BarChart3, Users, Settings, Camera, Target, Trophy } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenUsageGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenUsageGuide,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Painel Loja', icon: BarChart3 },
    { id: 'seller-card', label: 'Apresentação Vendedor', icon: Trophy },
    { id: 'entry', label: 'Lançar Resultados (OCR/Manual)', icon: Camera },
    { id: 'ai-insights', label: 'Análise Inteligente', icon: Sparkles },
    { id: 'config', label: 'Equipe & Metas', icon: Users },
  ];

  return (
    <header className="bg-[#121316]/90 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <img
              src="https://i.ibb.co/LdKcYjTq/01-LOGO-BOM-LAR-2024-sem-Tarja-PRINCIPAL.png"
              alt="Bom Lar Resultados"
              className="w-[150px] h-[120px] bg-[#151414] object-contain"
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[12px] font-bold tracking-tight text-white">
                  Bom Lar <span className="text-[#00b5ac]">Resultados</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-[#f36e21]/20 text-[#f36e21] border border-[#f36e21]/30">
                  Gamificado
                </span>
              </div>
              <p className="text-xs text-gray-400 hidden sm:block">Gestão de Metas & Performance de Vendas</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="hidden md:flex space-x-1 bg-[#1a1b20] p-1.5 rounded-2xl border border-white/5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#00b5ac] to-[#008d86] text-white shadow-md shadow-[#00b5ac]/20 font-semibold'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenUsageGuide}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[#1e2026] text-gray-200 hover:text-white hover:bg-[#282a32] border border-white/10 transition-all shadow-sm"
              title="Ver Roteiro de Uso Passo a Passo"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#00b5ac]" />
              <span className="hidden sm:inline">Roteiro de Uso</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden overflow-x-auto py-2 border-t border-white/5 space-x-1 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap font-medium transition-all ${
                  isActive
                    ? 'bg-[#00b5ac] text-white font-semibold shadow-sm'
                    : 'text-gray-400 hover:text-white bg-[#1a1b20]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
