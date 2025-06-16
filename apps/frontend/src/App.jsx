import React, { useState, useEffect } from 'react'
import { Activity, Cpu, Database, Zap } from 'lucide-react'
import ASCIIHeader from './components/ASCIIHeader'
import StatusBar from './components/StatusBar'
import TabNavigation from './components/TabNavigation'
import DashboardTab from './components/tabs/DashboardTab'
import WorkflowsTab from './components/tabs/WorkflowsTab'
import MonitoringTab from './components/tabs/MonitoringTab'
import DefinitionsTab from './components/tabs/DefinitionsTab'
import ConsoleTab from './components/tabs/ConsoleTab'
import CommandSection from './components/CommandSection'
import { useApi } from './hooks/useApi'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [systemStatus, setSystemStatus] = useState({
    healthy: true,
    workflowCount: 0,
    alertCount: 0,
    currentTime: new Date().toLocaleTimeString()
  })

  const { data: healthData, loading: healthLoading, error: healthError } = useApi('/api/accounts/health')
  const { data: workflowStats, error: statsError } = useApi('/api/workflows/stats')

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemStatus(prev => ({
        ...prev,
        currentTime: new Date().toLocaleTimeString()
      }))
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Update system status from API data
  useEffect(() => {
    if (healthData && workflowStats) {
      setSystemStatus(prev => ({
        ...prev,
        healthy: healthData.success,
        workflowCount: workflowStats.data?.activeExecutions || 0,
        alertCount: workflowStats.data?.monitoring?.alerts?.unacknowledged || 0
      }))
    }
  }, [healthData, workflowStats])

  // Handle system errors
  useEffect(() => {
    if (healthError || statsError) {
      setSystemStatus(prev => ({
        ...prev,
        healthy: false
      }))
    }
  }, [healthError, statsError])

  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard', icon: Activity },
    { id: 'workflows', label: '🔄 Active Workflows', icon: Zap },
    { id: 'monitoring', label: '📈 Monitoring', icon: Cpu },
    { id: 'definitions', label: '📚 Workflows', icon: Database },
    { id: 'console', label: '💻 Console', icon: Activity }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab />
      case 'workflows':
        return <WorkflowsTab />
      case 'monitoring':
        return <MonitoringTab />
      case 'definitions':
        return <DefinitionsTab />
      case 'console':
        return <ConsoleTab />
      default:
        return <DashboardTab />
    }
  }

  return (
    <div className="terminal-container">
      <ASCIIHeader />
      
      <StatusBar 
        systemStatus={systemStatus}
        loading={healthLoading}
      />

      <div className="terminal-content">
        <TabNavigation 
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div className="tab-content active">
          {renderTabContent()}
        </div>
      </div>

      <CommandSection />
    </div>
  )
}

export default App