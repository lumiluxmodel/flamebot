// test/testCronWorkflow.js
const workflowManager = require('../src/services/workflowManager');
const workflowExecutor = require('../src/services/workflowExecutor');
const cronMonitor = require('../src/services/cronMonitor');
const db = require('../src/services/databaseService');

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

// Función para imprimir con color
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Función para mostrar ayuda
function showHelp() {
    console.log(`
${colors.cyan}🚀 Workflow Test Tool${colors.reset}

${colors.bright}Uso:${colors.reset}
  node test/testCronWorkflow.js <comando> [opciones]

${colors.bright}Comandos:${colors.reset}
  start <accountId> <workflowType>    Inicia un workflow para una cuenta
  monitor [accountId]                  Monitorea workflows activos
  status <accountId>                   Muestra el estado de un workflow
  stop <accountId>                     Detiene un workflow
  stats                                Muestra estadísticas del sistema
  health                               Verifica la salud del sistema
  list                                 Lista todos los workflows activos
  test-quick <accountId>               Ejecuta un test rápido (workflow test)

${colors.bright}Tipos de Workflow:${colors.reset}
  default     - Workflow estándar (1h espera → prompt → swipes → bio 24h)
  aggressive  - Workflow agresivo (tiempos reducidos)
  test        - Workflow de prueba (30s → prompt → 5 swipes → bio 2min)

${colors.bright}Ejemplos:${colors.reset}
  node test/testCronWorkflow.js start 68511f93ec6acd2798f3811d default
  node test/testCronWorkflow.js monitor
  node test/testCronWorkflow.js monitor 68511f93ec6acd2798f3811d
  node test/testCronWorkflow.js status 68511f93ec6acd2798f3811d
  node test/testCronWorkflow.js test-quick myTestAccount001
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
        // Inicializar el sistema
        log('\n⚙️  Inicializando sistema de workflows...', 'cyan');
        await workflowManager.initialize();
        log('✅ Sistema inicializado correctamente\n', 'green');

        switch (command) {
            case 'start':
                await startWorkflow(args[1], args[2]);
                break;
                
            case 'monitor':
                await monitorWorkflows(args[1]);
                break;
                
            case 'status':
                await showWorkflowStatus(args[1]);
                break;
                
            case 'stop':
                await stopWorkflow(args[1]);
                break;
                
            case 'stats':
                await showStats();
                break;
                
            case 'health':
                await checkHealth();
                break;
                
            case 'list':
                await listActiveWorkflows();
                break;
                
            case 'test-quick':
                await runQuickTest(args[1]);
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
        console.error(error);
        process.exit(1);
    }
}

// Función para iniciar un workflow
async function startWorkflow(accountId, workflowType = 'default') {
    if (!accountId) {
        log('❌ Error: Se requiere accountId', 'red');
        return;
    }

    const validTypes = ['default', 'aggressive', 'test'];
    if (!validTypes.includes(workflowType)) {
        log(`❌ Error: Tipo de workflow inválido. Usa: ${validTypes.join(', ')}`, 'red');
        return;
    }

    log(`\n🚀 Iniciando workflow...`, 'cyan');
    log(`   Account ID: ${accountId}`, 'yellow');
    log(`   Workflow: ${workflowType}`, 'yellow');

    // Datos de cuenta simulados para la prueba
    const accountData = {
        model: 'Aura',
        channel: 'gram',
        authToken: 'test_token',
        importedAt: new Date().toISOString()
    };

    const result = await workflowManager.startAccountAutomation(accountId, accountData, workflowType);

    if (result.success) {
        log(`\n✅ Workflow iniciado exitosamente!`, 'green');
        log(`   Execution ID: ${result.executionId}`, 'cyan');
        log(`   Total pasos: ${result.totalSteps}`, 'cyan');
        log(`   Duración estimada: ${formatDuration(result.estimatedDuration)}`, 'cyan');
        
        // Mostrar los primeros pasos
        const status = workflowManager.getAccountWorkflowStatus(accountId);
        if (status && status.nextStep) {
            log(`\n   Próximo paso: ${status.nextStep.description}`, 'yellow');
            log(`   Se ejecutará en: ${new Date(Date.now() + (status.nextStep.delay || 0)).toLocaleString()}`, 'yellow');
        }
    } else {
        log(`\n❌ Error al iniciar workflow: ${result.error}`, 'red');
    }
}

// Función para monitorear workflows
async function monitorWorkflows(accountId = null) {
    log(`\n📊 Monitoreando workflows...`, 'cyan');
    
    let monitoring = true;
    let lastUpdate = new Date();
    
    // Capturar Ctrl+C para salir limpiamente
    process.on('SIGINT', () => {
        monitoring = false;
        log('\n\n⏹️  Deteniendo monitoreo...', 'yellow');
        setTimeout(() => process.exit(0), 1000);
    });

    while (monitoring) {
        console.clear();
        log(`🔍 Monitor de Workflows - ${new Date().toLocaleString()}`, 'cyan');
        log('═'.repeat(60), 'cyan');

        if (accountId) {
            // Monitorear cuenta específica
            const status = workflowManager.getAccountWorkflowStatus(accountId);
            
            if (status) {
                displayWorkflowStatus(status, true);
                
                // Mostrar log de ejecución
                if (status.executionLog && status.executionLog.length > 0) {
                    log('\n📋 Últimas actividades:', 'yellow');
                    status.executionLog.forEach(entry => {
                        const icon = entry.success ? '✅' : '❌';
                        const color = entry.success ? 'green' : 'red';
                        log(`   ${icon} ${entry.stepId} - ${formatTime(entry.timestamp)}`, color);
                    });
                }
            } else {
                log(`\n⚠️  No se encontró workflow activo para: ${accountId}`, 'yellow');
            }
        } else {
            // Monitorear todos los workflows
            const activeWorkflows = workflowManager.getAllActiveWorkflows();
            
            if (activeWorkflows.length === 0) {
                log('\n📭 No hay workflows activos', 'yellow');
            } else {
                log(`\n📊 Workflows activos: ${activeWorkflows.length}`, 'green');
                
                activeWorkflows.forEach((workflow, index) => {
                    log(`\n${index + 1}. Account: ${workflow.accountId}`, 'bright');
                    log(`   Tipo: ${workflow.workflowType} | Progreso: ${workflow.progress}%`, 'cyan');
                    log(`   Paso: ${workflow.currentStep}/${workflow.totalSteps}`, 'yellow');
                    log(`   Iniciado: ${formatTime(workflow.startedAt)}`, 'blue');
                    log(`   Última actividad: ${formatTime(workflow.lastActivity)}`, 'blue');
                });
            }
        }

        // Mostrar estadísticas del sistema
        const stats = workflowManager.getWorkflowStats();
        log('\n📈 Estadísticas del Sistema:', 'magenta');
        log(`   Total ejecutados: ${stats.totalExecutions}`, 'cyan');
        log(`   Exitosos: ${stats.successfulExecutions} (${stats.successRate.toFixed(1)}%)`, 'green');
        log(`   Fallidos: ${stats.failedExecutions}`, 'red');
        log(`   Activos: ${stats.activeExecutions}`, 'yellow');

        // Mostrar alertas si hay
        const alerts = workflowManager.getAlerts(true);
        if (alerts.length > 0) {
            log(`\n🚨 Alertas sin reconocer: ${alerts.length}`, 'red');
            alerts.slice(0, 3).forEach(alert => {
                log(`   [${alert.severity}] ${alert.message}`, 'yellow');
            });
        }

        log('\n' + '─'.repeat(60), 'cyan');
        log('Presiona Ctrl+C para salir | Actualizando cada 5 segundos...', 'blue');

        // Esperar 5 segundos antes de actualizar
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

// Función para mostrar el estado de un workflow
async function showWorkflowStatus(accountId) {
    if (!accountId) {
        log('❌ Error: Se requiere accountId', 'red');
        return;
    }

    const status = workflowManager.getAccountWorkflowStatus(accountId);
    
    if (!status) {
        log(`\n⚠️  No se encontró workflow activo para: ${accountId}`, 'yellow');
        return;
    }

    displayWorkflowStatus(status);
}

// Función para detener un workflow
async function stopWorkflow(accountId) {
    if (!accountId) {
        log('❌ Error: Se requiere accountId', 'red');
        return;
    }

    log(`\n🛑 Deteniendo workflow para: ${accountId}`, 'yellow');
    
    const result = await workflowManager.stopAccountAutomation(accountId);
    
    if (result.success) {
        log('✅ Workflow detenido exitosamente', 'green');
    } else {
        log(`❌ Error al detener workflow: ${result.error}`, 'red');
    }
}

// Función para mostrar estadísticas
async function showStats() {
    const stats = workflowManager.getWorkflowStats();
    const dashboard = workflowManager.getMonitoringDashboard();

    log('\n📊 ESTADÍSTICAS DEL SISTEMA', 'cyan');
    log('═'.repeat(50), 'cyan');

    log('\n🎯 Workflows:', 'yellow');
    log(`   Total ejecutados: ${stats.totalExecutions}`, 'bright');
    log(`   Exitosos: ${stats.successfulExecutions} (${stats.successRate.toFixed(1)}%)`, 'green');
    log(`   Fallidos: ${stats.failedExecutions}`, 'red');
    log(`   Activos ahora: ${stats.activeExecutions}`, 'yellow');
    log(`   Tiempo promedio: ${formatDuration(stats.averageExecutionTime)}`, 'cyan');

    log('\n⚙️  Sistema Cron:', 'yellow');
    log(`   Estado: ${stats.cronSystem.isRunning ? 'Activo' : 'Detenido'}`, stats.cronSystem.isRunning ? 'green' : 'red');
    log(`   Jobs activos: ${stats.cronSystem.totalCronJobs}`, 'bright');
    log(`   Tareas programadas: ${stats.cronSystem.scheduledTasks}`, 'bright');
    log(`   Tareas ejecutadas: ${stats.cronSystem.executedTasks}`, 'green');
    log(`   Tareas fallidas: ${stats.cronSystem.failedTasks}`, 'red');

    log('\n📋 Task Scheduler:', 'yellow');
    log(`   Tareas activas: ${stats.taskScheduler.stats.activeTasks}`, 'bright');
    log(`   En cola: ${stats.taskScheduler.queuedTasks}`, 'yellow');
    log(`   Completadas: ${stats.taskScheduler.stats.completedTasks}`, 'green');
    log(`   Fallidas: ${stats.taskScheduler.stats.failedTasks}`, 'red');

    log('\n🔔 Alertas:', 'yellow');
    log(`   Total: ${dashboard.alerts.summary.total}`, 'bright');
    log(`   Sin reconocer: ${dashboard.alerts.summary.unacknowledged}`, 'yellow');
    log(`   Críticas: ${dashboard.alerts.summary.critical}`, 'red');
    log(`   Advertencias: ${dashboard.alerts.summary.warnings}`, 'yellow');

    log('\n💚 Salud del Sistema:', 'yellow');
    log(`   Estado general: ${stats.overallHealth}`, stats.overallHealth === 'healthy' ? 'green' : 'red');
    log(`   Última verificación: ${formatTime(stats.lastUpdate)}`, 'cyan');
}

// Función para verificar la salud del sistema
async function checkHealth() {
    log('\n🏥 Verificando salud del sistema...', 'cyan');
    
    const health = workflowManager.getHealthStatus();
    
    log(`\n${health.healthy ? '✅' : '❌'} Estado general: ${health.healthy ? 'SALUDABLE' : 'CON PROBLEMAS'}`, health.healthy ? 'green' : 'red');
    
    log('\n📊 Componentes:', 'yellow');
    
    // Workflow Executor
    const executor = health.components.workflowExecutor;
    log(`\n   Workflow Executor:`, 'bright');
    log(`     Estado: ${executor.initialized ? 'Inicializado' : 'No inicializado'}`, executor.initialized ? 'green' : 'red');
    log(`     Ejecuciones activas: ${executor.activeExecutions}`, 'cyan');
    log(`     Total ejecutados: ${executor.totalExecutions}`, 'cyan');
    log(`     Tasa de éxito: ${executor.successRate.toFixed(1)}%`, executor.successRate > 90 ? 'green' : 'yellow');
    
    // Cron Manager
    const cron = health.components.cronManager;
    log(`\n   Cron Manager:`, 'bright');
    log(`     Estado: ${cron.running ? 'Ejecutándose' : 'Detenido'}`, cron.running ? 'green' : 'red');
    log(`     Jobs activos: ${cron.totalCronJobs}`, 'cyan');
    log(`     Tareas programadas: ${cron.scheduledTasks}`, 'cyan');
    log(`     Tareas ejecutadas: ${cron.executedTasks}`, 'green');
    log(`     Tareas fallidas: ${cron.failedTasks}`, cron.failedTasks > 0 ? 'yellow' : 'green');
    
    // Task Scheduler
    const scheduler = health.components.taskScheduler;
    log(`\n   Task Scheduler:`, 'bright');
    log(`     Tareas activas: ${scheduler.activeTasks}`, 'cyan');
    log(`     Completadas: ${scheduler.completedTasks}`, 'green');
    log(`     Fallidas: ${scheduler.failedTasks}`, scheduler.failedTasks > 0 ? 'yellow' : 'green');
    log(`     En cola: ${scheduler.queuedTasks}`, scheduler.queuedTasks > 10 ? 'yellow' : 'cyan');
    
    // Cron Monitor
    const monitor = health.components.cronMonitor;
    log(`\n   Cron Monitor:`, 'bright');
    log(`     Estado: ${monitor.monitoring ? 'Monitoreando' : 'Inactivo'}`, monitor.monitoring ? 'green' : 'red');
    log(`     Salud del sistema: ${monitor.systemHealth}`, monitor.systemHealth === 'healthy' ? 'green' : 'red');
    log(`     Tasa de éxito: ${monitor.successRate.toFixed(1)}%`, monitor.successRate > 90 ? 'green' : 'yellow');
    log(`     Alertas sin reconocer: ${monitor.unacknowledgedAlerts}`, monitor.unacknowledgedAlerts > 0 ? 'yellow' : 'green');
}

// Función para listar workflows activos
async function listActiveWorkflows() {
    const activeWorkflows = workflowManager.getAllActiveWorkflows();
    
    log('\n📋 WORKFLOWS ACTIVOS', 'cyan');
    log('═'.repeat(80), 'cyan');
    
    if (activeWorkflows.length === 0) {
        log('\n📭 No hay workflows activos en este momento', 'yellow');
        return;
    }
    
    log(`\nTotal: ${activeWorkflows.length} workflows activos\n`, 'green');
    
    activeWorkflows.forEach((workflow, index) => {
        log(`${index + 1}. ${workflow.accountId}`, 'bright');
        log(`   ├─ Tipo: ${workflow.workflowType}`, 'cyan');
        log(`   ├─ Progreso: ${'█'.repeat(Math.floor(workflow.progress / 10))}${'░'.repeat(10 - Math.floor(workflow.progress / 10))} ${workflow.progress}%`, 'yellow');
        log(`   ├─ Paso actual: ${workflow.currentStep}/${workflow.totalSteps}`, 'blue');
        log(`   ├─ Iniciado: ${formatTime(workflow.startedAt)}`, 'magenta');
        log(`   └─ Última actividad: ${formatTime(workflow.lastActivity)}\n`, 'magenta');
    });
}

// Función para ejecutar un test rápido
async function runQuickTest(accountId) {
    if (!accountId) {
        accountId = `test_${Date.now()}`;
        log(`\n📝 Generando ID de cuenta de prueba: ${accountId}`, 'yellow');
    }

    log('\n🧪 Ejecutando test rápido con workflow "test"', 'cyan');
    log('   Este workflow tiene delays cortos para pruebas:\n', 'yellow');
    log('   1. Espera 30 segundos', 'blue');
    log('   2. Agrega prompt (inmediato)', 'blue');
    log('   3. Ejecuta 5 swipes (inmediato)', 'blue');
    log('   4. Agrega bio después de 2 minutos\n', 'blue');

    await startWorkflow(accountId, 'test');
    
    log('\n📊 Iniciando monitoreo automático del test...', 'green');
    log('   (El monitoreo se detendrá cuando el workflow complete)\n', 'yellow');
    
    // Esperar un momento antes de iniciar el monitoreo
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Monitorear hasta que complete
    let completed = false;
    while (!completed) {
        const status = workflowManager.getAccountWorkflowStatus(accountId);
        
        if (!status) {
            completed = true;
            log('\n✅ Workflow completado o detenido', 'green');
        } else {
            console.clear();
            log('🧪 TEST RÁPIDO EN PROGRESO', 'cyan');
            log('═'.repeat(50), 'cyan');
            displayWorkflowStatus(status, true);
            
            if (status.status !== 'active') {
                completed = true;
            }
        }
        
        if (!completed) {
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    log('\n✅ Test completado!', 'green');
}

// Función auxiliar para mostrar el estado de un workflow
function displayWorkflowStatus(status, detailed = false) {
    log(`\n📄 Workflow: ${status.accountId}`, 'bright');
    log(`   Tipo: ${status.workflowType}`, 'cyan');
    log(`   Estado: ${status.status}`, status.status === 'active' ? 'green' : 'yellow');
    log(`   Progreso: ${'█'.repeat(Math.floor(status.progress / 10))}${'░'.repeat(10 - Math.floor(status.progress / 10))} ${status.progress}%`, 'yellow');
    log(`   Paso actual: ${status.currentStep}/${status.totalSteps}`, 'blue');
    
    if (status.nextStep) {
        log(`\n   📍 Próximo paso: ${status.nextStep.description}`, 'magenta');
        const nextExecution = new Date(Date.now() + (status.nextStep.delay || 0));
        log(`   ⏰ Se ejecutará: ${nextExecution.toLocaleString()}`, 'cyan');
    }
    
    if (detailed) {
        log(`\n   🕐 Iniciado: ${formatTime(status.startedAt)}`, 'blue');
        log(`   🕐 Última actividad: ${formatTime(status.lastActivity)}`, 'blue');
        
        if (status.retryCount > 0) {
            log(`   🔄 Reintentos: ${status.retryCount}/${status.maxRetries}`, 'yellow');
        }
        
        if (status.lastError) {
            log(`   ❌ Último error: ${status.lastError}`, 'red');
        }
        
        if (status.continuousSwipeActive) {
            log(`   🔄 Swipe continuo: ACTIVO`, 'green');
        }
    }
}

// Funciones auxiliares
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

function formatTime(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleTimeString();
}

// Manejo de salida limpia
process.on('exit', async () => {
    try {
        await db.close();
        log('\n👋 Conexión cerrada correctamente', 'green');
    } catch (error) {
        // Ignorar errores al cerrar
    }
});

// Ejecutar
main().catch(error => {
    log(`\n❌ Error fatal: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});