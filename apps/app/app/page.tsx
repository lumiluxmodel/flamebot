'use client';
import React, { useState, useEffect } from 'react';
import { Heart, Menu } from 'lucide-react';

// Import modular components
import Overview from '../components/Overview';
import Workflows from '../components/Workflows';
import System from '../components/System';
import Alerts from '../components/Alerts';
import WorkflowModal from '../components/WorkflowModal';
import { useActiveWorkflows } from '../lib/api';
import { ClientOnlyIcon, formatTime } from '../components/common';

// Types
interface WorkflowStep {
  id: string;
  action: string;
  delay: number;
  description: string;
  swipeCount?: number;
  minSwipes?: number;
  maxSwipes?: number;
  minIntervalMs?: number;
  maxIntervalMs?: number;
  critical?: boolean;
  timeout?: number;
}

interface Workflow {
  type: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  duration: string;
  color: string;
  accent: string;
  config?: {
    maxRetries?: number;
    retryBackoffMs?: number;
    timeoutMs?: number;
  };
}

// Main Component
export default function FlameBotDashboard() {
  const [activeSection, setActiveSection] = useState('001');
  const [time, setTime] = useState<Date | null>(null);
  const [glitchActive, setGlitchActive] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modal state for workflow creation/editing
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);

  // Get real data with hooks
  const { data: activeWorkflows } = useActiveWorkflows();

  useEffect(() => {
    // Set initial time on client side only
    setTime(new Date());
    
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const glitchTimer = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 200);
    }, 8000);
    return () => clearInterval(glitchTimer);
  }, []);

  const sections = [
    { id: '001', label: 'OVERVIEW', jp: 'オーバービュー' },
    { id: '002', label: 'WORKFLOWS', jp: 'ワークフロー' },
    { id: '003', label: 'SYSTEM', jp: 'システム' },
    { id: '004', label: 'ALERTS', jp: 'アラート' }
  ];

  const openCreateModal = () => {
    setEditingWorkflow(null);
    setShowCreateModal(true);
  };

  const openEditModal = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setShowEditModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingWorkflow(null);
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono overflow-hidden relative">
      {/* Enhanced background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(234,179,8,0.03),transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.015] bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.05)_2px,rgba(255,255,255,0.05)_4px)]" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent animate-pulse" />
      </div>

      <div className="flex h-screen relative">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden fixed top-4 left-4 z-50 p-2 bg-zinc-900 border border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/10 transition-colors"
        >
          <ClientOnlyIcon>
            <Menu className="w-5 h-5" />
          </ClientOnlyIcon>
        </button>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar */}
        <div className={`
          fixed md:relative w-64 h-full border-r border-zinc-900 bg-black/95 backdrop-blur-xl p-4 md:p-8 
          flex flex-col justify-between z-40 transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div>
            <div className="mb-12 md:mb-16">
              <h1 className={`text-2xl md:text-3xl font-bold mb-2 transition-all duration-300 ${
                glitchActive ? 'animate-pulse text-yellow-500 scale-110' : ''
              }`}>
                侍
              </h1>
              <div className="text-[10px] text-zinc-600">
                FLAME<span className="text-yellow-500">[</span>BOT<span className="text-yellow-500">]</span>
              </div>
            </div>

            <nav className="space-y-6 md:space-y-8">
              {sections.map((section, i) => (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id);
                    setSidebarOpen(false);
                  }}
                  className={`block text-left transition-all duration-300 group w-full hover:transform hover:translate-x-2 ${
                    activeSection === section.id ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className={`text-[10px] mb-1 transition-colors ${
                    activeSection === section.id ? 'text-yellow-500' : 'group-hover:text-yellow-500/70'
                  }`}>
                    {section.id}
                  </div>
                  <div className="text-sm uppercase tracking-wider">{section.label}</div>
                  <div className="text-[10px] text-zinc-700 mt-1">{section.jp}</div>
                  <div className={`mt-2 h-[1px] bg-yellow-500 transition-all duration-300 ${
                    activeSection === section.id ? 'w-8' : 'w-0 group-hover:w-4'
                  }`} />
                </button>
              ))}
            </nav>
          </div>

          <div className="text-[10px] text-zinc-600 space-y-1">
            <div className="text-yellow-500 font-mono">{time ? formatTime(time) : '--:--'}</div>
            <div>TOKYO-3</div>
            <div>35.6762°N</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 md:p-8 lg:p-16 w-full max-w-none">
            {activeSection === '001' && <Overview />}
            {activeSection === '002' && (
              <Workflows
                setEditingWorkflow={openEditModal}
                setShowEditModal={setShowEditModal}
                setShowCreateModal={openCreateModal}
              />
            )}
            {activeSection === '003' && <System />}
            {activeSection === '004' && time && <Alerts time={time} />}
          </div>
        </div>

        {/* Right Panel - Enhanced with real executions */}
        <div className="hidden lg:flex w-64 xl:w-80 border-l border-zinc-900 p-6 xl:p-8 flex-col justify-between relative overflow-hidden">
          {/* Background with FLAME text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-[120px] xl:text-[200px] font-bold text-zinc-950 opacity-20 animate-pulse">炎</div>
          </div>
          
          <div className="text-right text-[10px] text-zinc-600 relative z-10">
            <div className="text-yellow-500">001/004</div>
            <div>TOKYO-3</div>
          </div>

          {/* Active Executions */}
          <div className="relative z-10 space-y-4">
            <div className="text-[10px] text-zinc-600 mb-4 text-center">ACTIVE_EXECUTIONS</div>
            {activeWorkflows && activeWorkflows.length > 0 ? (
              activeWorkflows.slice(0, 3).map((execution, i) => (
                <div key={execution.executionId} className="bg-zinc-950/40 border border-zinc-800/50 p-3 backdrop-blur-sm animate-fade-in" style={{ animationDelay: `${i * 0.2}s` }}>
                  <div className="text-[9px] text-zinc-500 mb-1">EXECUTION_ID</div>
                  <div className="font-mono text-[10px] text-yellow-500 mb-2 break-all">{execution.executionId.slice(-8)}</div>
                  <div className="flex justify-between text-[9px] mb-2">
                    <span className="text-zinc-400">{execution.workflowType.toUpperCase()}</span>
                    <span className={`${execution.status === 'active' ? 'text-emerald-500' : 'text-zinc-500'} pulse-dot`}>
                      ● {execution.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between text-[9px] mb-2">
                    <span className="text-zinc-500">PROGRESS</span>
                    <span className="text-yellow-500">{execution.progress}%</span>
                  </div>
                  <div className="bg-zinc-900 h-1 w-full rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full transition-all duration-1000"
                      style={{ width: `${execution.progress}%` }}
                    />
                  </div>
                  <div className="text-[8px] text-zinc-600 mt-1">{execution.currentStep}</div>
                </div>
              ))
            ) : (
              <div className="text-center text-zinc-600 text-[11px]">
                No active workflows
              </div>
            )}
          </div>

          <div className="text-center relative z-10">
            <div className="text-6xl xl:text-8xl font-bold text-zinc-800 mb-4 hover:text-zinc-700 transition-colors duration-500">炎</div>
            <div className="text-[10px] text-yellow-500 tracking-widest">FLAME</div>
          </div>

          <div className="text-[10px] text-zinc-600 relative z-10">
            <div className="mb-2 text-yellow-500">c.FUTURE [B]</div>
            <div className="flex items-center justify-end gap-1 text-[11px]">
              <span>made with</span>
              <ClientOnlyIcon>
                <Heart className="w-3 h-3 text-red-500 animate-pulse" />
              </ClientOnlyIcon>
              <span>by pimbo</span>
            </div>
          </div>
          
          <div className="absolute bottom-0 right-0 w-16 xl:w-24 h-16 xl:h-24 opacity-50" 
               style={{
                 clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
                 background: 'repeating-linear-gradient(45deg, #eab308, #eab308 2px, #18181b 2px, #18181b 4px)'
               }}>
          </div>
        </div>
      </div>

      {/* Enhanced Create/Edit Workflow Modal */}
      {(showCreateModal || showEditModal) && (
        <WorkflowModal
          isOpen={showCreateModal || showEditModal}
          isEdit={showEditModal}
          editingWorkflow={editingWorkflow}
          onClose={closeModals}
        />
      )}
    </div>
  );
}
