/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { UsageGuideModal } from './components/UsageGuideModal';
import { StoreDashboardTab } from './components/StoreDashboardTab';
import { SellerPresentationCard } from './components/SellerPresentationCard';
import { ResultsEntryTab } from './components/ResultsEntryTab';
import { TeamAndGoalsTab } from './components/TeamAndGoalsTab';
import { AIAnalysisTab } from './components/AIAnalysisTab';

import {
  Collaborator,
  GoalConfig,
  IndividualResult,
  StoreResult,
  AIAnalysisResponse,
} from './types';

import {
  INITIAL_GOAL_CONFIG,
  INITIAL_COLLABORATORS,
  INITIAL_INDIVIDUAL_RESULTS,
  INITIAL_STORE_RESULT,
} from './data/initialData';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isUsageGuideOpen, setIsUsageGuideOpen] = useState<boolean>(false);
  const [selectedSellerId, setSelectedSellerId] = useState<string>('seller-727');

  // Core Data State (persisted in localStorage for convenience)
  const [goalConfig, setGoalConfig] = useState<GoalConfig>(() => {
    const saved = localStorage.getItem('pharma_goal_config');
    return saved ? JSON.parse(saved) : INITIAL_GOAL_CONFIG;
  });

  const [collaborators, setCollaborators] = useState<Collaborator[]>(() => {
    const saved = localStorage.getItem('pharma_collaborators');
    return saved ? JSON.parse(saved) : INITIAL_COLLABORATORS;
  });

  const [individualResults, setIndividualResults] = useState<Record<string, IndividualResult>>(() => {
    const saved = localStorage.getItem('pharma_individual_results');
    return saved ? JSON.parse(saved) : INITIAL_INDIVIDUAL_RESULTS;
  });

  const [storeResult, setStoreResult] = useState<StoreResult>(() => {
    const saved = localStorage.getItem('pharma_store_result');
    return saved ? JSON.parse(saved) : INITIAL_STORE_RESULT;
  });

  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResponse | null>(() => {
    const saved = localStorage.getItem('pharma_ai_analysis');
    return saved ? JSON.parse(saved) : null;
  });

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('pharma_goal_config', JSON.stringify(goalConfig));
  }, [goalConfig]);

  useEffect(() => {
    localStorage.setItem('pharma_collaborators', JSON.stringify(collaborators));
  }, [collaborators]);

  useEffect(() => {
    localStorage.setItem('pharma_individual_results', JSON.stringify(individualResults));
  }, [individualResults]);

  useEffect(() => {
    localStorage.setItem('pharma_store_result', JSON.stringify(storeResult));
  }, [storeResult]);

  useEffect(() => {
    if (aiAnalysis) {
      localStorage.setItem('pharma_ai_analysis', JSON.stringify(aiAnalysis));
    }
  }, [aiAnalysis]);

  const sellers = collaborators.filter((c) => c.isSeller);

  // Ensure valid selected seller
  useEffect(() => {
    if (sellers.length > 0 && !sellers.some((s) => s.id === selectedSellerId)) {
      setSelectedSellerId(sellers[0].id);
    }
  }, [collaborators, selectedSellerId]);

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white font-sans antialiased selection:bg-[#00b5ac] selection:text-white">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenUsageGuide={() => setIsUsageGuideOpen(true)}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'dashboard' && (
          <StoreDashboardTab
            goalConfig={goalConfig}
            storeResult={storeResult}
            collaborators={collaborators}
            individualResults={individualResults}
            onSelectSeller={(id) => {
              setSelectedSellerId(id);
              setActiveTab('seller-card');
            }}
            onGoToEntry={() => setActiveTab('entry')}
          />
        )}

        {activeTab === 'seller-card' && (
          <SellerPresentationCard
            sellers={sellers}
            selectedSellerId={selectedSellerId}
            setSelectedSellerId={setSelectedSellerId}
            goalConfig={goalConfig}
            individualResults={individualResults}
            aiAnalysisSellers={aiAnalysis?.sellers}
          />
        )}

        {activeTab === 'entry' && (
          <ResultsEntryTab
            collaborators={collaborators}
            individualResults={individualResults}
            setIndividualResults={setIndividualResults}
            storeResult={storeResult}
            setStoreResult={setStoreResult}
            onAfterConfirmResults={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'ai-insights' && (
          <AIAnalysisTab
            goalConfig={goalConfig}
            storeResult={storeResult}
            collaborators={collaborators}
            individualResults={individualResults}
            aiAnalysis={aiAnalysis}
            setAiAnalysis={setAiAnalysis}
          />
        )}

        {activeTab === 'config' && (
          <TeamAndGoalsTab
            collaborators={collaborators}
            setCollaborators={setCollaborators}
            goalConfig={goalConfig}
            setGoalConfig={setGoalConfig}
          />
        )}
      </main>

      {/* Usage Guide Step-by-Step Modal */}
      <UsageGuideModal
        isOpen={isUsageGuideOpen}
        onClose={() => setIsUsageGuideOpen(false)}
        onStartWorkflow={() => setActiveTab('entry')}
      />
    </div>
  );
}
