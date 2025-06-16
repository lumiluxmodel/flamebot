import React, { useState, useEffect, useRef } from 'react';
import { useAccounts } from '../../hooks/useAccounts';
import { useActions } from '../../hooks/useActions';
import { useWorkflows } from '../../hooks/useWorkflows';
import LoadingSpinner from '../LoadingSpinner';

const ConsoleTab = () => {
  const [newAccountData, setNewAccountData] = useState({
    model: '',
    cookie: '',
    workflowType: 'default'
  });
  const [bulkImportData, setBulkImportData] = useState('');
  const [consoleOutput, setConsoleOutput] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const consoleRef = useRef(null);

  const {
    accounts,
    models,
    loading: accountsLoading,
    importAccount,
    importMultipleAccounts,
    importAccountWithWorkflow,
    getAccountsSummary,
    startPolling: startAccountPolling,
    stopPolling: stopAccountPolling
  } = useAccounts();

  const {
    activeTasks: allActiveTasks,
    models: actionModels,
    loading: actionsLoading,
    getTasksByType,
    getTasksByStatus
  } = useActions();

  const {
    workflows,
    definitions,
    statistics: workflowStats,
    loading: workflowLoading
  } = useWorkflows();

  // Auto-scroll console output
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [consoleOutput]);

  // Start polling for live updates
  useEffect(() => {
    startAccountPolling(30000);
    return () => stopAccountPolling();
  }, []);

  // Add system startup message
  useEffect(() => {
    addToConsole('system', 'FLAMEBOT CONSOLE INITIALIZED');
    addToConsole('system', 'Ready for account import and workflow management');
  }, []);

  const addToConsole = (type, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleOutput(prev => [...prev.slice(-99), { // Keep last 100 entries
      id: Date.now() + Math.random(),
      type,
      message,
      timestamp,
      data
    }]);
  };

  const handleSingleImport = async () => {
    if (!newAccountData.model || !newAccountData.cookie) {
      addToConsole('error', 'Model and cookie are required');
      return;
    }

    setIsImporting(true);
    try {
      addToConsole('info', `Starting import for model: ${newAccountData.model}`);
      
      const result = await importAccountWithWorkflow({
        model: newAccountData.model,
        cookie: newAccountData.cookie
      }, newAccountData.workflowType);

      if (result.success) {
        addToConsole('success', 
          `✅ Account imported successfully: ${result.data.import.accountId}`,
          result.data
        );
        addToConsole('info', 
          `🚀 Workflow started: ${result.data.workflow.executionId} (${newAccountData.workflowType})`
        );
        
        // Clear form
        setNewAccountData({
          model: '',
          cookie: '',
          workflowType: 'default'
        });
      } else {
        addToConsole('error', `❌ Import failed: ${result.error}`);
      }
    } catch (error) {
      addToConsole('error', `❌ Import error: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkImportData.trim()) {
      addToConsole('error', 'Please provide account data for bulk import');
      return;
    }

    setIsImporting(true);
    try {
      // Parse bulk import data (expecting JSON or CSV format)
      const lines = bulkImportData.trim().split('\n');
      const accountsToImport = [];

      lines.forEach((line, index) => {
        try {
          if (line.trim()) {
            // Try parsing as JSON first
            if (line.includes('{')) {
              const accountData = JSON.parse(line);
              accountsToImport.push(accountData);
            } else {
              // Try parsing as comma-separated values: model,cookie
              const [model, cookie] = line.split(',').map(s => s.trim());
              if (model && cookie) {
                accountsToImport.push({ model, cookie });
              }
            }
          }
        } catch (error) {
          addToConsole('warning', `Line ${index + 1} could not be parsed: ${line}`);
        }
      });

      if (accountsToImport.length === 0) {
        addToConsole('error', 'No valid accounts found in bulk data');
        return;
      }

      addToConsole('info', `Starting bulk import for ${accountsToImport.length} accounts`);

      const result = await importMultipleAccounts(accountsToImport, true);

      if (result.success) {
        addToConsole('success', 
          `✅ Bulk import completed: ${result.data.successCount}/${accountsToImport.length} successful`
        );
        
        if (result.data.failedCount > 0) {
          addToConsole('warning', 
            `⚠️ ${result.data.failedCount} accounts failed to import`
          );
        }

        // Clear bulk data
        setBulkImportData('');
      } else {
        addToConsole('error', `❌ Bulk import failed: ${result.error}`);
      }
    } catch (error) {
      addToConsole('error', `❌ Bulk import error: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const clearConsole = () => {
    setConsoleOutput([]);
    addToConsole('system', 'Console cleared');
  };

  const exportConsoleLog = () => {
    const logText = consoleOutput.map(entry => 
      `[${entry.timestamp}] ${entry.type.toUpperCase()}: ${entry.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flamebot-console-${new Date().toISOString().split('T')[0]}.log`;
    a.click();
    URL.revokeObjectURL(url);
    
    addToConsole('info', 'Console log exported');
  };

  if (accountsLoading || actionsLoading || workflowLoading) {
    return <LoadingSpinner text="INITIALIZING CONSOLE..." />;
  }

  // Calculate summary data
  const accountsSummary = getAccountsSummary();
  const activeTasks = getTasksByStatus('active');
  const completedTasks = getTasksByStatus('completed');
  const swipeTasks = getTasksByType('swipe');
  const bioTasks = getTasksByType('bio_update');
  
  const availableModels = models.length > 0 ? models : actionModels;
  const availableWorkflowTypes = definitions.map(def => def.type);

  // Console message styling
  const getMessageClass = (type) => {
    switch (type) {
      case 'success': return 'console-success';
      case 'error': return 'console-error';
      case 'warning': return 'console-warning';
      case 'info': return 'console-info';
      case 'system': return 'console-system';
      default: return 'console-default';
    }
  };

  return (
    <>
      {/* Import Section */}
      <div className="console-section">
        <div className="section-header">
          <span className="section-title">ACCOUNT IMPORT</span>
          <div className="section-stats">
            <span>Total: {accountsSummary.total}</span>
            <span>Active: {accountsSummary.active}</span>
            <span>Success: {accountsSummary.success}</span>
          </div>
        </div>

        <div className="import-forms">
          {/* Single Account Import */}
          <div className="import-form">
            <div className="form-header">
              <span className="form-title">Single Account</span>
            </div>
            <div className="form-content">
              <div className="form-row">
                <label>Model:</label>
                <select 
                  className="form-select"
                  value={newAccountData.model}
                  onChange={(e) => setNewAccountData(prev => ({
                    ...prev,
                    model: e.target.value
                  }))}
                  disabled={isImporting}
                >
                  <option value="">Select Model</option>
                  {availableModels.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-row">
                <label>Workflow Type:</label>
                <select 
                  className="form-select"
                  value={newAccountData.workflowType}
                  onChange={(e) => setNewAccountData(prev => ({
                    ...prev,
                    workflowType: e.target.value
                  }))}
                  disabled={isImporting}
                >
                  {availableWorkflowTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <label>Cookie:</label>
                <textarea
                  className="form-textarea"
                  value={newAccountData.cookie}
                  onChange={(e) => setNewAccountData(prev => ({
                    ...prev,
                    cookie: e.target.value
                  }))}
                  placeholder="Paste cookie data here..."
                  rows="3"
                  disabled={isImporting}
                />
              </div>

              <div className="form-actions">
                <button 
                  className="btn btn-primary"
                  onClick={handleSingleImport}
                  disabled={isImporting || !newAccountData.model || !newAccountData.cookie}
                >
                  {isImporting ? '⏳ Importing...' : '🚀 Import & Start Workflow'}
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Import */}
          <div className="import-form">
            <div className="form-header">
              <span className="form-title">Bulk Import</span>
              <span className="form-help">JSON objects or CSV format (model,cookie)</span>
            </div>
            <div className="form-content">
              <div className="form-row">
                <label>Accounts Data:</label>
                <textarea
                  className="form-textarea bulk-textarea"
                  value={bulkImportData}
                  onChange={(e) => setBulkImportData(e.target.value)}
                  placeholder={`Formats supported:
1. JSON per line: {"model": "model_name", "cookie": "cookie_data"}
2. CSV format: model_name,cookie_data

Example:
{"model": "eva_cute", "cookie": "_gid=GA1.2.123..."}
alice_wild,_gid=GA1.2.456...`}
                  rows="6"
                  disabled={isImporting}
                />
              </div>
              
              <div className="form-actions">
                <button 
                  className="btn btn-primary"
                  onClick={handleBulkImport}
                  disabled={isImporting || !bulkImportData.trim()}
                >
                  {isImporting ? '⏳ Importing...' : '📦 Bulk Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="console-section">
        <div className="section-header">
          <span className="section-title">LIVE STATISTICS</span>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-title">ACCOUNTS</span>
            </div>
            <div className="stat-content">
              <div className="stat-row">
                <span className="stat-label">Total:</span>
                <span className="stat-value">{accountsSummary.total}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Active Workflows:</span>
                <span className="stat-value success">{accountsSummary.active}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Imported:</span>
                <span className="stat-value">{accountsSummary.imported}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Failed:</span>
                <span className="stat-value error">{accountsSummary.failed}</span>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-title">WORKFLOWS</span>
            </div>
            <div className="stat-content">
              <div className="stat-row">
                <span className="stat-label">Active:</span>
                <span className="stat-value success">{workflows.length}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Total Executed:</span>
                <span className="stat-value">{workflowStats?.executor?.totalExecutions || 0}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Success Rate:</span>
                <span className="stat-value">
                  {workflowStats?.executor?.successRate ? 
                    `${Math.round(workflowStats.executor.successRate)}%` : 'N/A'}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Definitions:</span>
                <span className="stat-value">{definitions.length}</span>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-title">TASKS</span>
            </div>
            <div className="stat-content">
              <div className="stat-row">
                <span className="stat-label">Active:</span>
                <span className="stat-value success">{activeTasks.length}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Completed:</span>
                <span className="stat-value">{completedTasks.length}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Swipe Tasks:</span>
                <span className="stat-value">{swipeTasks.length}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Bio Tasks:</span>
                <span className="stat-value">{bioTasks.length}</span>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-title">SYSTEM</span>
            </div>
            <div className="stat-content">
              <div className="stat-row">
                <span className="stat-label">Models Available:</span>
                <span className="stat-value">{availableModels.length}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Workflow Types:</span>
                <span className="stat-value">{availableWorkflowTypes.length}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Console Entries:</span>
                <span className="stat-value">{consoleOutput.length}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Status:</span>
                <span className="stat-value success">OPERATIONAL</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Console Output */}
      <div className="console-section">
        <div className="section-header">
          <span className="section-title">CONSOLE OUTPUT</span>
          <div className="console-actions">
            <button className="btn btn-secondary" onClick={exportConsoleLog}>
              💾 Export Log
            </button>
            <button className="btn btn-warning" onClick={clearConsole}>
              🗑️ Clear Console
            </button>
          </div>
        </div>
        
        <div className="console-container">
          <div className="console-output" ref={consoleRef}>
            {consoleOutput.map(entry => (
              <div key={entry.id} className={`console-line ${getMessageClass(entry.type)}`}>
                <span className="console-timestamp">[{entry.timestamp}]</span>
                <span className="console-type">{entry.type.toUpperCase()}:</span>
                <span className="console-message">{entry.message}</span>
                {entry.data && (
                  <div className="console-data">
                    <pre>{JSON.stringify(entry.data, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))}
            
            {consoleOutput.length === 0 && (
              <div className="console-line console-system">
                <span className="console-message">Console is empty. Import accounts to see activity.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ConsoleTab;