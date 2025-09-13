// Dashboard de Estadísticas - Stockeando
class DashboardStats {
    constructor() {
        this.updateInterval = null;
    }

    // Inicializar dashboard
    init() {
        this.createStatsContainer();
        this.updateStats();
        this.startAutoUpdate();
    }

    // Crear contenedor de estadísticas
    createStatsContainer() {
        const existingStats = document.getElementById('dashboard-stats');
        if (existingStats) {
            existingStats.remove();
        }

        const statsContainer = document.createElement('div');
        statsContainer.id = 'dashboard-stats';
        statsContainer.innerHTML = `
            <div style="
                position: fixed;
                bottom: 20px;
                left: 20px;
                background: white;
                border-radius: var(--radius-xl);
                box-shadow: var(--shadow-lg);
                padding: var(--space-4);
                z-index: 1000;
                min-width: 250px;
                border: 1px solid var(--secondary-200);
                animation: slideIn 0.5s ease-out;
            ">
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: var(--space-3);
                    padding-bottom: var(--space-2);
                    border-bottom: 1px solid var(--secondary-200);
                ">
                    <h4 style="
                        margin: 0;
                        color: var(--secondary-800);
                        font-size: var(--text-sm);
                        font-weight: 600;
                    ">📊 Estadísticas</h4>
                    <button onclick="dashboardStats.toggle()" style="
                        background: none;
                        border: none;
                        cursor: pointer;
                        font-size: var(--text-lg);
                        color: var(--secondary-600);
                        padding: 0;
                        width: 24px;
                        height: 24px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: var(--radius-md);
                        transition: all var(--transition-fast);
                    " onmouseover="this.style.background='var(--secondary-100)'" onmouseout="this.style.background='none'">
                        📌
                    </button>
                </div>
                <div id="stats-content" style="
                    display: grid;
                    gap: var(--space-2);
                    font-size: var(--text-xs);
                ">
                    <!-- Las estadísticas se cargarán aquí -->
                </div>
                <div style="
                    margin-top: var(--space-3);
                    padding-top: var(--space-2);
                    border-top: 1px solid var(--secondary-200);
                    text-align: center;
                ">
                    <button onclick="dashboardStats.exportData()" style="
                        background: var(--primary-500);
                        color: white;
                        border: none;
                        padding: var(--space-1) var(--space-3);
                        border-radius: var(--radius-md);
                        cursor: pointer;
                        font-size: var(--text-xs);
                        transition: all var(--transition-fast);
                    " onmouseover="this.style.background='var(--primary-600)'" onmouseout="this.style.background='var(--primary-500)'">
                        💾 Exportar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(statsContainer);
    }

    // Actualizar estadísticas
    updateStats() {
        const stats = productStateManager.getMovementStats();
        const inventory = this.getInventoryStats();
        
        const statsContent = document.getElementById('stats-content');
        if (!statsContent) return;

        statsContent.innerHTML = `
            <div class="stat-item">
                <span style="color: var(--primary-600); font-weight: 600;">🔄 Movimientos:</span>
                <span>${stats.total}</span>
            </div>
            <div class="stat-item">
                <span style="color: var(--success-600); font-weight: 600;">📅 Hoy:</span>
                <span>${stats.today}</span>
            </div>
            <div class="stat-item">
                <span style="color: var(--error-600); font-weight: 600;">❌ Rechazados:</span>
                <span>${stats.rejected}</span>
            </div>
            <div class="stat-item">
                <span style="color: var(--warning-600); font-weight: 600;">📦 En Depósito:</span>
                <span>${inventory.deposito}</span>
            </div>
            <div class="stat-item">
                <span style="color: var(--secondary-600); font-weight: 600;">🚚 En Tránsito:</span>
                <span>${inventory.transito}</span>
            </div>
            <div class="stat-item">
                <span style="color: var(--primary-600); font-weight: 600;">📋 Pedidos:</span>
                <span>${inventory.pedidos}</span>
            </div>
        `;

        // Agregar estilos para los items
        const style = document.createElement('style');
        style.textContent = `
            .stat-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: var(--space-1) 0;
            }
        `;
        if (!document.getElementById('stats-styles')) {
            style.id = 'stats-styles';
            document.head.appendChild(style);
        }
    }

    // Obtener estadísticas de inventario
    getInventoryStats() {
        const inventory = JSON.parse(localStorage.getItem('stockeando_inventory')) || {};
        
        return {
            deposito: (inventory.deposito || []).length,
            transito: (inventory.transito || []).length,
            pedidos: (inventory.pedidos || []).length,
            planta1: (inventory.planta1 || []).length,
            planta2: (inventory.planta2 || []).length,
            planta3: (inventory.planta3 || []).length
        };
    }

    // Iniciar actualización automática
    startAutoUpdate() {
        this.updateInterval = setInterval(() => {
            this.updateStats();
        }, 30000); // Actualizar cada 30 segundos
    }

    // Detener actualización automática
    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    // Toggle del dashboard
    toggle() {
        const statsContainer = document.getElementById('dashboard-stats');
        if (statsContainer) {
            const isVisible = statsContainer.style.display !== 'none';
            statsContainer.style.display = isVisible ? 'none' : 'block';
            
            if (!isVisible) {
                statsContainer.style.animation = 'slideIn 0.3s ease-out';
                this.updateStats();
            }
        }
    }

    // Exportar datos
    exportData() {
        const data = productStateManager.exportData();
        const inventory = JSON.parse(localStorage.getItem('stockeando_inventory')) || {};
        const categories = JSON.parse(localStorage.getItem('stockeando_categories')) || {};
        
        const exportData = {
            ...data,
            inventory,
            categories,
            stats: {
                movements: productStateManager.getMovementStats(),
                inventory: this.getInventoryStats()
            }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stockeando-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Mostrar notificación de éxito
        if (typeof showNotification === 'function') {
            showNotification('Datos exportados correctamente', 'success');
        }
    }

    // Destruir dashboard
    destroy() {
        this.stopAutoUpdate();
        const statsContainer = document.getElementById('dashboard-stats');
        if (statsContainer) {
            statsContainer.remove();
        }
    }
}

// Crear instancia global
const dashboardStats = new DashboardStats();

// Auto-inicializar en páginas de inventario
document.addEventListener('DOMContentLoaded', () => {
    // Solo mostrar en páginas específicas
    const currentPage = window.location.pathname.split('/').pop();
    if (['inventario.html', 'productos.html', 'movimientos.html'].includes(currentPage)) {
        setTimeout(() => {
            dashboardStats.init();
        }, 1000);
    }
});

// Limpiar al salir de la página
window.addEventListener('beforeunload', () => {
    dashboardStats.destroy();
});