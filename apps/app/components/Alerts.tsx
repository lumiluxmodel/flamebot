// components/Alerts.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { apiClient } from '../lib/api';
import { LoadingSpinner, ClientOnlyIcon, formatTime, ScrollArea } from './common';

interface AlertsProps {
  time: Date;
}

type SeverityFilter = 'all' | 'critical' | 'error' | 'warning' | 'info';

const Alerts: React.FC<AlertsProps> = ({ time }) => {
  const [alerts, setAlerts] = useState<Array<{
    id?: string;
    severity: string;
    message: string;
    timestamp: string;
    acknowledged?: boolean;
  }>>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [acknowledgingAlert, setAcknowledgingAlert] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [showOnlyUnacknowledged, setShowOnlyUnacknowledged] = useState(false);

  const loadAlerts = useCallback(async () => {
    try {
      const result = await apiClient.getAlerts(showOnlyUnacknowledged, 100);
      setAlerts(result.alerts || []);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setAlertsLoading(false);
    }
  }, [showOnlyUnacknowledged]);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [loadAlerts]);

  const handleAcknowledgeAlert = async (alertId: string) => {
    if (!alertId) return;
    
    try {
      setAcknowledgingAlert(alertId);
      await apiClient.acknowledgeAlert(alertId);
      await loadAlerts(); // Reload alerts
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    } finally {
      setAcknowledgingAlert(null);
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
    return true;
  });

  const alertCounts = alerts.reduce((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;

  if (alertsLoading) {
    return (
      <div>
        <header className="mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-2 text-zinc-900 dark:text-white">ALERTS</h1>
          <div className="text-[11px] text-zinc-600 dark:text-zinc-500">警報システム</div>
        </header>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <header className="mb-8 md:mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-2 text-zinc-900 dark:text-white">ALERTS</h1>
        <div className="text-[11px] text-zinc-600 dark:text-zinc-500">警報システム</div>
      </header>

      {/* Alert Summary Card */}
      <div className="cyber-card p-6 md:p-8 mb-6 relative animate-fade-in">
        <div className="text-center">
          <ClientOnlyIcon>
            <AlertCircle className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 text-zinc-300 dark:text-zinc-800 animate-pulse" />
          </ClientOnlyIcon>
          <div className="text-2xl md:text-3xl font-bold text-zinc-800 dark:text-white mb-2">
            {alerts.length}
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-500 mb-1">
            ACTIVE ALERTS
          </div>
          {unacknowledgedCount > 0 && (
            <div className="text-[11px] text-yellow-600 dark:text-yellow-500">
              {unacknowledgedCount} unacknowledged
            </div>
          )}
          <div className="mt-3 text-[10px] text-zinc-600 dark:text-zinc-600">
            {alerts.length === 0 ? 'System operating normally' : 'Check alert details below'}
          </div>
          <div className="mt-2 text-[10px] text-yellow-600 dark:text-yellow-500">
            {alerts.length === 0 ? 'すべてクリア' : '注意が必要'}
          </div>
        </div>
      </div>

      {/* Alert Count Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { level: 'CRITICAL', count: alertCounts.critical || 0, color: 'border-red-500/20', textColor: 'text-red-600 dark:text-red-500' },
          { level: 'ERROR', count: alertCounts.error || 0, color: 'border-orange-500/20', textColor: 'text-orange-600 dark:text-orange-500' },
          { level: 'WARNING', count: alertCounts.warning || 0, color: 'border-yellow-500/20', textColor: 'text-yellow-600 dark:text-yellow-500' },
          { level: 'INFO', count: alertCounts.info || 0, color: 'border-zinc-200 dark:border-zinc-900', textColor: 'text-zinc-600 dark:text-zinc-500' }
        ].map((alert, i) => (
          <div 
            key={i} 
            className={`cyber-card ${alert.color} p-4 text-center hover:border-opacity-50 transition-all duration-300 animate-fade-in-scale group cursor-pointer ${
              severityFilter === alert.level.toLowerCase() ? 'ring-2 ring-yellow-500/50' : ''
            }`}
            style={{ animationDelay: `${i * 0.1}s` }}
            onClick={() => setSeverityFilter(severityFilter === alert.level.toLowerCase() ? 'all' : alert.level.toLowerCase() as SeverityFilter)}
          >
            <div className={`text-2xl md:text-3xl font-bold mb-1 group-hover:scale-110 transition-transform ${alert.textColor}`}>
              {alert.count}
            </div>
            <div className="text-[10px] text-zinc-600">{alert.level}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="unacknowledged"
            checked={showOnlyUnacknowledged}
            onChange={(e) => setShowOnlyUnacknowledged(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="unacknowledged" className="text-sm text-zinc-600 dark:text-zinc-400">
            Show only unacknowledged
          </label>
        </div>
        {severityFilter !== 'all' && (
          <button
            onClick={() => setSeverityFilter('all')}
            className="text-[11px] text-yellow-600 dark:text-yellow-500 hover:text-yellow-700 dark:hover:text-yellow-400"
          >
            Clear filter: {severityFilter.toUpperCase()}
          </button>
        )}
      </div>

      {/* Recent Alerts with Scroll */}
      {filteredAlerts.length > 0 && (
        <div className="flex-1 min-h-0">
          <div className="text-[10px] text-zinc-600 mb-4 flex items-center gap-4">
            <span>RECENT_ALERTS</span>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-yellow-500/20 to-transparent"></div>
          </div>
          <ScrollArea className="h-[400px] pr-2">
            <div className="space-y-3">
              {filteredAlerts.map((alert, i) => (
                <div 
                  key={alert.id || i} 
                  className={`cyber-card p-4 flex justify-between items-start animate-fade-in ${
                    alert.acknowledged ? 'opacity-60' : ''
                  }`} 
                  style={{ animationDelay: `${Math.min(i * 0.05, 0.3)}s` }}
                >
                  <div className="flex-1 pr-4">
                    <div className={`text-sm font-mono mb-1 ${
                      alert.severity === 'critical' ? 'text-zinc-700 dark:text-zinc-300' :
                      alert.severity === 'error' ? 'text-zinc-700 dark:text-zinc-300' :
                      alert.severity === 'warning' ? 'text-zinc-700 dark:text-zinc-300' : 
                      'text-zinc-600 dark:text-zinc-400'
                    }`} style={{ fontFamily: 'var(--font-share-tech), monospace' }}>
                      {alert.message}
                    </div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-600">
                      {new Date(alert.timestamp).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`text-[10px] uppercase font-medium ${
                      alert.severity === 'critical' ? 'text-red-600 dark:text-red-500' :
                      alert.severity === 'error' ? 'text-orange-600 dark:text-orange-500' :
                      alert.severity === 'warning' ? 'text-yellow-600 dark:text-yellow-500' : 
                      'text-zinc-600 dark:text-zinc-500'
                    }`}>
                      {alert.severity}
                    </div>
                    {alert.id && !alert.acknowledged && (
                      <button
                        onClick={() => handleAcknowledgeAlert(alert.id!)}
                        disabled={acknowledgingAlert === alert.id}
                        className="p-1.5 text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors disabled:opacity-50"
                        title="Acknowledge alert"
                      >
                        <ClientOnlyIcon>
                          {acknowledgingAlert === alert.id ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </ClientOnlyIcon>
                      </button>
                    )}
                    {alert.acknowledged && (
                      <div className="text-emerald-600 dark:text-emerald-500" title="Acknowledged">
                        <ClientOnlyIcon>
                          <CheckCircle className="w-4 h-4" />
                        </ClientOnlyIcon>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {filteredAlerts.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-zinc-600 dark:text-zinc-500 mb-2">NO ALERTS</div>
            <div className="text-[11px] text-zinc-600 dark:text-zinc-600">
              {severityFilter !== 'all' ? `No ${severityFilter} alerts` : 'System is running smoothly'}
            </div>
          </div>
        </div>
      )}

      <div className="mt-auto pt-6 text-center animate-fade-in">
        <div className="text-[10px] text-zinc-600">LAST SCAN</div>
        <div className="text-yellow-600 dark:text-yellow-500 font-mono text-sm mt-1">{time ? formatTime(time) : '--:--'}</div>
      </div>
    </div>
  );
};

export default Alerts;
