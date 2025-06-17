// test/testWorkflowViaAPI.js
const axios = require('axios');

// Configuración
const API_BASE_URL = process.env.API_URL || 'http://localhost:3090/api';
const API_KEY = process.env.API_KEY || 'your-api-key-here';

// Cliente HTTP
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
    },
    timeout: 30000
});

// Colores para la consola
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Mostrar ayuda
function showHelp() {
    console.log(`
${colors.cyan}🚀 Workflow Test Tool (API Version)${colors.reset}

${colors.bright}Uso:${colors.reset}
  node test/testWorkflowViaAPI.js <comando> [opciones]

${colors.bright}Comandos:${colors.reset}
  start <accountId> <workflowType>    Inicia un workflow para una cuenta
  import-and-start <workflowType>     Importa cuenta de prueba e inicia workflow
  status <accountId>                   Muestra el estado de un workflow
  stop <accountId>                     Detiene un workflow
  list                                 Lista todos los workflows activos
  monitor [accountId]                  Monitorea workflows (via API)

${colors.bright}Tipos de Workflow:${colors.reset}
  default     - Workflow estándar (1h espera → prompt → swipes → bio 24h)
  aggressive  - Workflow agresivo (tiempos reducidos)
  test        - Workflow de prueba (30s → prompt → 5 swipes → bio 2min)

${colors.bright}Ejemplos:${colors.reset}
  node test/testWorkflowViaAPI.js import-and-start test
  node test/testWorkflowViaAPI.js start 68511f93ec6acd2798f3811d default
  node test/testWorkflowViaAPI.js status 68511f93ec6acd2798f3811d
  node test/testWorkflowViaAPI.js monitor
`);
}

// Función principal
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        showHelp();
        process.exit(0);
    }

    const command = args[0].toLowerCase();

    try {
        switch (command) {
            case 'start':
                await startWorkflowOnly(args[1], args[2]);
                break;
                
            case 'import-and-start':
                await importAndStartWorkflow(args[1]);
                break;
                
            case 'status':
                await getWorkflowStatus(args[1]);
                break;
                
            case 'stop':
                await stopWorkflow(args[1]);
                break;
                
            case 'list':
                await listActiveWorkflows();
                break;
                
            case 'monitor':
                await monitorWorkflows(args[1]);
                break;
                
            case 'help':
            case '--help':
            case '-h':
                showHelp();
                break;
                
            default:
                log(`❌ Comando desconocido: ${command}`, 'red');
                showHelp();
                process.exit(1);
        }

    } catch (error) {
        log(`\n❌ Error: ${error.message}`, 'red');
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
        process.exit(1);
    }
}

// Importar cuenta de prueba e iniciar workflow
async function importAndStartWorkflow(workflowType = 'test') {
    log('\n📦 Importando cuenta de prueba...', 'cyan');
    
    // Generar datos de prueba
    const testAccountData = {
        authToken: `test_token_${Date.now()}`,
        proxy: 'http://test:proxy@127.0.0.1:8080',
        model: 'Aura',
        location: 'US',
        channel: 'gram',
        startAutomation: true,
        workflowType: workflowType,
        waitForCompletion: false
    };
    
    try {
        // Importar cuenta con workflow automático
        const response = await apiClient.post('/account/import', testAccountData);
        
        if (response.data.success) {
            const { accountId, model, channel } = response.data.data;
            
            log('\n✅ Cuenta importada exitosamente!', 'green');
            log(`   Account ID: ${accountId}`, 'cyan');
            log(`   Model: ${model}`, 'cyan');
            log(`   Channel: ${channel}`, 'cyan');
            
            if (response.data.data.automation?.started) {
                log(`\n✅ Workflow iniciado automáticamente!`, 'green');
                log(`   Tipo: ${workflowType}`, 'yellow');
                
                // Esperar un momento y mostrar estado
                await new Promise(resolve => setTimeout(resolve, 2000));
                await getWorkflowStatus(accountId);
                
                log(`\n💡 Usa este comando para monitorear:`, 'yellow');
                log(`   node test/testWorkflowViaAPI.js monitor ${accountId}`, 'cyan');
            }
        } else {
            log(`\n❌ Error al importar cuenta: ${response.data.error}`, 'red');
        }
        
    } catch (error) {
        throw new Error(`Failed to import account: ${error.message}`);
    }
}

// Iniciar workflow para cuenta existente (sin importar)
async function startWorkflowOnly(accountId, workflowType = 'default') {
    if (!accountId) {
        log('❌ Error: Se requiere accountId', 'red');
        return;
    }

    log(`\n🚀 Iniciando workflow para cuenta existente...`, 'cyan');
    log(`   Account ID: ${accountId}`, 'yellow');
    log(`   Workflow: ${workflowType}`, 'yellow');

    try {
        const response = await apiClient.post('/workflows/start', {
            accountId,
            accountData: {
                model: 'Aura',
                channel: 'gram'
            },
            workflowType
        });

        if (response.data.success) {
            log('\n✅ Workflow iniciado exitosamente!', 'green');
            log(`   Execution ID: ${response.data.data.executionId}`, 'cyan');
            log(`   Total pasos: ${response.data.data.totalSteps}`, 'cyan');
            log(`   Duración estimada: ${formatDuration(response.data.data.estimatedDuration)}`, 'cyan');
        } else {
            log(`\n❌ Error: ${response.data.error}`, 'red');
        }

    } catch (error) {
        throw new Error(`Failed to start workflow: ${error.message}`);
    }
}

// Obtener estado del workflow
async function getWorkflowStatus(accountId) {
    if (!accountId) {
        log('❌ Error: Se requiere accountId', 'red');
        return;
    }

    try {
        const response = await apiClient.get(`/workflows/status/${accountId}`);
        
        if (response.data.success && response.data.data) {
            const status = response.data.data;
            
            log(`\n📄 Estado del Workflow: ${accountId}`, 'bright');
            log(`   Estado: ${status.status}`, status.status === 'active' ? 'green' : 'yellow');
            log(`   Tipo: ${status.workflowType}`, 'cyan');
            log(`   Progreso: ${'█'.repeat(Math.floor(status.progressPercentage / 10))}${'░'.repeat(10 - Math.floor(status.progressPercentage / 10))} ${status.progressPercentage}%`, 'yellow');
            log(`   Paso actual: ${status.currentStep}/${status.totalSteps}`, 'blue');
            
            if (status.nextStepDescription) {
                log(`\n   📍 Próximo paso: ${status.nextStepDescription}`, 'magenta');
                if (status.nextStepETA) {
                    log(`   ⏰ Se ejecutará: ${new Date(status.nextStepETA).toLocaleString()}`, 'cyan');
                }
            }
            
            if (status.timeElapsed) {
                log(`\n   ⏱️ Tiempo transcurrido: ${formatDuration(status.timeElapsed)}`, 'blue');
            }
        } else {
            log(`\n⚠️ No se encontró workflow activo para: ${accountId}`, 'yellow');
        }
        
    } catch (error) {
        if (error.response?.status === 404) {
            log(`\n⚠️ No se encontró workflow para: ${accountId}`, 'yellow');
        } else {
            throw error;
        }
    }
}

// Detener workflow
async function stopWorkflow(accountId) {
    if (!accountId) {
        log('❌ Error: Se requiere accountId', 'red');
        return;
    }

    log(`\n🛑 Deteniendo workflow...`, 'yellow');
    
    try {
        const response = await apiClient.post(`/workflows/stop/${accountId}`);
        
        if (response.data.success) {
            log('✅ Workflow detenido exitosamente', 'green');
        } else {
            log(`❌ Error: ${response.data.error}`, 'red');
        }
        
    } catch (error) {
        throw error;
    }
}

// Listar workflows activos
async function listActiveWorkflows() {
    try {
        const response = await apiClient.get('/workflows/active');
        
        if (response.data.success) {
            const { executions, summary } = response.data.data;
            
            log('\n📋 WORKFLOWS ACTIVOS', 'cyan');
            log('═'.repeat(80), 'cyan');
            
            if (executions.length === 0) {
                log('\n📭 No hay workflows activos', 'yellow');
                return;
            }
            
            log(`\nTotal: ${executions.length} workflows activos\n`, 'green');
            
            executions.forEach((workflow, index) => {
                log(`${index + 1}. ${workflow.accountId}`, 'bright');
                log(`   ├─ Tipo: ${workflow.workflowType}`, 'cyan');
                log(`   ├─ Progreso: ${'█'.repeat(Math.floor(workflow.progressPercentage / 10))}${'░'.repeat(10 - Math.floor(workflow.progressPercentage / 10))} ${workflow.progressPercentage}%`, 'yellow');
                log(`   ├─ Iniciado: ${new Date(workflow.startedAt).toLocaleString()}`, 'magenta');
                log(`   └─ Tiempo transcurrido: ${formatDuration(workflow.timeElapsed)}\n`, 'blue');
            });
            
            if (summary) {
                log('📊 Resumen por tipo:', 'yellow');
                Object.entries(summary.byWorkflowType).forEach(([type, count]) => {
                    log(`   ${type}: ${count}`, 'cyan');
                });
            }
        }
        
    } catch (error) {
        throw error;
    }
}

// Monitorear workflows
async function monitorWorkflows(accountId = null) {
    log(`\n📊 Monitoreando workflows via API...`, 'cyan');
    
    let monitoring = true;
    
    // Capturar Ctrl+C
    process.on('SIGINT', () => {
        monitoring = false;
        log('\n\n⏹️ Deteniendo monitoreo...', 'yellow');
        setTimeout(() => process.exit(0), 1000);
    });

    while (monitoring) {
        console.clear();
        log(`🔍 Monitor de Workflows - ${new Date().toLocaleString()}`, 'cyan');
        log('═'.repeat(60), 'cyan');

        try {
            if (accountId) {
                // Monitorear cuenta específica
                await getWorkflowStatus(accountId);
            } else {
                // Mostrar dashboard general
                const dashboardResponse = await apiClient.get('/workflows/monitoring/dashboard');
                
                if (dashboardResponse.data.success) {
                    const dashboard = dashboardResponse.data.data;
                    
                    // Overview
                    log('\n📊 Vista General:', 'yellow');
                    log(`   Workflows activos: ${dashboard.workflows.active}`, 'cyan');
                    log(`   Tasa de éxito: ${dashboard.overview.successRate.toFixed(1)}%`, 'green');
                    log(`   Última verificación: ${new Date(dashboard.overview.lastHealthCheck).toLocaleTimeString()}`, 'blue');
                    
                    // Workflows por tipo
                    if (dashboard.workflows.byType) {
                        log('\n📋 Por tipo:', 'yellow');
                        Object.entries(dashboard.workflows.byType).forEach(([type, count]) => {
                            log(`   ${type}: ${count}`, 'cyan');
                        });
                    }
                    
                    // Estado del sistema
                    log('\n💚 Estado del Sistema:', 'yellow');
                    log(`   Workflow Executor: ${dashboard.systemStatus.workflowExecutor ? '✅' : '❌'}`, 
                        dashboard.systemStatus.workflowExecutor ? 'green' : 'red');
                    log(`   Cron Manager: ${dashboard.systemStatus.cronManager ? '✅' : '❌'}`, 
                        dashboard.systemStatus.cronManager ? 'green' : 'red');
                    log(`   Task Scheduler: ${dashboard.systemStatus.taskScheduler ? '✅' : '❌'}`, 
                        dashboard.systemStatus.taskScheduler ? 'green' : 'red');
                    
                    // Alertas
                    if (dashboard.alerts.recent && dashboard.alerts.recent.length > 0) {
                        log('\n🚨 Alertas Recientes:', 'red');
                        dashboard.alerts.recent.slice(0, 3).forEach(alert => {
                            log(`   [${alert.severity}] ${alert.message}`, 'yellow');
                        });
                    }
                }
            }
        } catch (error) {
            log(`\n❌ Error al obtener datos: ${error.message}`, 'red');
        }

        log('\n' + '─'.repeat(60), 'cyan');
        log('Presiona Ctrl+C para salir | Actualizando cada 5 segundos...', 'blue');

        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

// Utilidades
function formatDuration(ms) {
    if (!ms || ms === 0) return '0s';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

// Ejecutar
main().catch(error => {
    log(`\n❌ Error fatal: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});