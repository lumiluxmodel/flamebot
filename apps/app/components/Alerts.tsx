// components/Alerts.tsx
import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { apiClient } from '../lib/api';
import { LoadingSpinner, ClientOnlyIcon, formatTime } from './common';

interface AlertsProps {
  time: Date;
}

const Alerts: React.FC<AlertsProps> = ({ time }) => {
  const [alerts, setAlerts] = useState<Array<{
    severity: string;
    message: string;
    timestamp: string;
  }>>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const result = await apiClient.getAlerts(false, 10);
        setAlerts(result.alerts || []);
      } catch (error) {
        console.error('Failed to load alerts:', error);
      } finally {
        setAlertsLoading(false);
      }
    };

    loadAlerts();
  }, []);

  if (alertsLoading) {
    return (
      <div>
        <header className="mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-2 text-white">ALERTS</h1>
          <div className="text-[11px] text-zinc-500">警報システム</div>
        </header>
        <LoadingSpinner />
      </div>
    );
  }

  const alertCounts = alerts.reduce((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <header className="mb-8 md:mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-2 text-white">ALERTS</h1>
        <div className="text-[11px] text-zinc-500">警報システム</div>
      </header>

      <div className="cyber-card p-8 md:p-16 mb-8 md:mb-12 relative animate-fade-in">
        <div className="text-center">
          <ClientOnlyIcon>
            <AlertCircle className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-6 text-zinc-800 animate-pulse" />
          </ClientOnlyIcon>
          <div className="text-lg text-zinc-600 mb-2">
            {alerts.length === 0 ? 'NO ACTIVE ALERTS' : `${alerts.length} ACTIVE ALERTS`}
          </div>
          <div className="text-[11px] text-zinc-700">
            {alerts.length === 0 ? 'System operating within normal parameters' : 'Check alert details below'}
          </div>
          <div className="mt-4 text-[10px] text-yellow-500">
            {alerts.length === 0 ? 'すべてクリア' : '注意が必要'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
        {[
          { level: 'CRITICAL', count: alertCounts.critical || 0, color: 'border-red-500/20', textColor: 'text-red-500' },
          { level: 'ERROR', count: alertCounts.error || 0, color: 'border-orange-500/20', textColor: 'text-orange-500' },
          { level: 'WARNING', count: alertCounts.warning || 0, color: 'border-yellow-500/20', textColor: 'text-yellow-500' },
          { level: 'INFO', count: alertCounts.info || 0, color: 'border-zinc-900', textColor: 'text-zinc-500' }
        ].map((alert, i) => (
          <div 
            key={i} 
            className={`cyber-card ${alert.color} p-4 md:p-6 text-center hover:border-opacity-50 transition-all duration-300 animate-fade-in-scale group`}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className={`text-3xl md:text-4xl font-bold mb-2 group-hover:scale-110 transition-transform ${alert.textColor}`}>
              {alert.count}
            </div>
            <div className="text-[10px] text-zinc-600">{alert.level}</div>
          </div>
        ))}
      </div>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <div className="mb-8 md:mb-12">
          <div className="text-[10px] text-zinc-600 mb-6 flex items-center gap-4">
            <span>RECENT_ALERTS</span>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-yellow-500/20 to-transparent"></div>
          </div>
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert, i) => (
              <div key={i} className="cyber-card p-4 flex justify-between items-center animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <div>
                  <div className={`text-sm font-mono ${
                    alert.severity === 'critical' ? 'text-red-500' :
                    alert.severity === 'error' ? 'text-orange-500' :
                    alert.severity === 'warning' ? 'text-yellow-500' : 'text-zinc-500'
                  }`}>
                    {alert.message}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">
                    {new Date(alert.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className={`text-[10px] uppercase ${
                  alert.severity === 'critical' ? 'text-red-500' :
                  alert.severity === 'error' ? 'text-orange-500' :
                  alert.severity === 'warning' ? 'text-yellow-500' : 'text-zinc-500'
                }`}>
                  {alert.severity}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="cyber-card p-6">
          <div className="text-[10px] text-zinc-600 mb-4">ALERT_DISTRIBUTION</div>
          <div className="space-y-3">
            {Object.entries(alertCounts).map(([severity, count]) => {
              const total = alerts.length;
              const percentage = total > 0 ? (count / total) * 100 : 0;
              const color = {
                critical: 'bg-red-500',
                error: 'bg-orange-500',
                warning: 'bg-yellow-500',
                info: 'bg-zinc-500'
              }[severity] || 'bg-zinc-500';
              
              return (
                <div key={severity} className="flex items-center gap-3">
                  <div className="text-[11px] uppercase w-16">{severity}</div>
                  <div className="flex-1 bg-zinc-900 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${color} rounded-full transition-all duration-1000`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-zinc-500 w-12 text-right">{count}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="cyber-card p-6">
          <div className="text-[10px] text-zinc-600 mb-4">ALERT_SUMMARY</div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Total Alerts</span>
              <span className="text-white">{alerts.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Unacknowledged</span>
              <span className="text-yellow-500">{alerts.filter(a => !('acknowledged' in a) || !a.acknowledged).length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Most Recent</span>
              <span className="text-zinc-400">
                {alerts.length > 0 ? new Date(alerts[0].timestamp).toLocaleTimeString() : 'None'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">System Health</span>
              <span className={alerts.length === 0 ? 'text-emerald-500' : 'text-yellow-500'}>
                {alerts.length === 0 ? 'HEALTHY' : 'MONITORING'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 md:mt-12 text-center animate-fade-in">
        <div className="text-[10px] text-zinc-600">LAST SCAN</div>
        <div className="text-yellow-500 font-mono text-sm mt-1">{time ? formatTime(time) : '--:--'}</div>
      </div>
    </div>
  );
};

export default Alerts;
