// Sistema de Reportes y Análisis para Stockeando
class ReportsAnalytics {
    constructor() {
        this.charts = {};
        this.currentFilters = {
            period: 30,
            dateFrom: null,
            dateTo: null,
            plant: 'all'
        };
        this.init();
    }

    init() {
        this.loadInitialData();
        this.setupEventListeners();
        this.setDefaultDates();
    }

    setDefaultDates() {
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        document.getElementById('dateTo').value = today.toISOString().split('T')[0];
        document.getElementById('dateFrom').value = thirtyDaysAgo.toISOString().split('T')[0];
    }

    setupEventListeners() {
        document.getElementById('periodFilter').addEventListener('change', (e) => {
            this.currentFilters.period = e.target.value;
            if (e.target.value !== 'custom') {
                this.updateDateInputs();
            }
        });
    }

    updateDateInputs() {
        const period = this.currentFilters.period;
        const today = new Date();
        let fromDate;

        switch(period) {
            case '7':
                fromDate = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
                break;
            case '30':
                fromDate = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
                break;
            case '90':
                fromDate = new Date(today.getTime() - (90 * 24 * 60 * 60 * 1000));
                break;
            case 'all':
                fromDate = new Date('2020-01-01');
                break;
            default:
                return;
        }

        document.getElementById('dateFrom').value = fromDate.toISOString().split('T')[0];
        document.getElementById('dateTo').value = today.toISOString().split('T')[0];
    }

    loadInitialData() {
        this.generateStats();
        this.createCharts();
        this.loadDetailedReports();
    }

    getFilteredData() {
        const movements = productStateManager.getAllMovements();
        const rejectedProducts = this.getRejectedProducts();
        const inventory = this.getInventoryData();

        let filteredMovements = movements;
        let filteredRejected = rejectedProducts;

        // Filtrar por fechas
        const dateFrom = document.getElementById('dateFrom').value;
        const dateTo = document.getElementById('dateTo').value;

        if (dateFrom && dateTo) {
            const fromTime = new Date(dateFrom).getTime();
            const toTime = new Date(dateTo).getTime() + (24 * 60 * 60 * 1000);

            filteredMovements = movements.filter(m => {
                const moveTime = new Date(m.timestamp).getTime();
                return moveTime >= fromTime && moveTime <= toTime;
            });

            filteredRejected = rejectedProducts.filter(r => {
                const rejectTime = new Date(r.date).getTime();
                return rejectTime >= fromTime && rejectTime <= toTime;
            });
        }

        // Filtrar por planta
        const plantFilter = document.getElementById('plantFilter').value;
        if (plantFilter !== 'all') {
            filteredMovements = filteredMovements.filter(m => 
                m.from.includes(`plant${plantFilter}`) || 
                m.to.includes(`plant${plantFilter}`) ||
                m.from.includes(`planta${plantFilter}`) || 
                m.to.includes(`planta${plantFilter}`)
            );

            filteredRejected = rejectedProducts.filter(r => 
                r.plantNumber == plantFilter
            );
        }

        return {
            movements: filteredMovements,
            rejected: filteredRejected,
            inventory: inventory
        };
    }

    generateStats() {
        const data = this.getFilteredData();
        const movements = data.movements;
        const rejected = data.rejected;
        const inventory = data.inventory;

        // Calcular estadísticas
        const totalMovements = movements.length;
        const totalRejected = rejected.length;
        const totalProducts = Object.values(inventory).flat().length;
        
        // Calcular peso total
        let totalWeight = 0;
        movements.forEach(m => {
            if (m.productData && m.productData.weight) {
                totalWeight += parseFloat(m.productData.weight) || 0;
            }
        });

        // Calcular eficiencia
        const efficiency = totalMovements > 0 ? 
            ((totalMovements - totalRejected) / totalMovements * 100).toFixed(1) : 0;

        // Productos únicos procesados
        const uniqueProducts = new Set(movements.map(m => 
            m.productData?.name || m.productId
        )).size;

        const stats = [
            {
                icon: '📦',
                number: totalMovements,
                label: 'Total Movimientos'
            },
            {
                icon: '✅',
                number: uniqueProducts,
                label: 'Productos Únicos'
            },
            {
                icon: '❌',
                number: totalRejected,
                label: 'Productos Rechazados'
            },
            {
                icon: '📊',
                number: `${efficiency}%`,
                label: 'Eficiencia General'
            },
            {
                icon: '⚖️',
                number: `${totalWeight.toFixed(1)}kg`,
                label: 'Peso Total Procesado'
            },
            {
                icon: '🏭',
                number: this.getActivePlants(movements),
                label: 'Plantas Activas'
            }
        ];

        this.renderStats(stats);
    }

    getActivePlants(movements) {
        const plants = new Set();
        movements.forEach(m => {
            if (m.from.includes('plant') || m.from.includes('planta')) {
                const plantNum = m.from.match(/\d+/);
                if (plantNum) plants.add(plantNum[0]);
            }
            if (m.to.includes('plant') || m.to.includes('planta')) {
                const plantNum = m.to.match(/\d+/);
                if (plantNum) plants.add(plantNum[0]);
            }
        });
        return plants.size;
    }

    renderStats(stats) {
        const statsGrid = document.getElementById('statsGrid');
        statsGrid.innerHTML = stats.map(stat => `
            <div class="stat-card">
                <div class="stat-icon">${stat.icon}</div>
                <div class="stat-number">${stat.number}</div>
                <div class="stat-label">${stat.label}</div>
            </div>
        `).join('');
    }

    createCharts() {
        this.createMovementsChart();
        this.createPlantsChart();
        this.createProductsChart();
        this.createRejectionsChart();
    }

    createMovementsChart() {
        const data = this.getFilteredData();
        const movements = data.movements;

        // Agrupar por día
        const dailyMovements = {};
        movements.forEach(m => {
            const date = new Date(m.timestamp).toLocaleDateString('es-ES');
            dailyMovements[date] = (dailyMovements[date] || 0) + 1;
        });

        const sortedDates = Object.keys(dailyMovements).sort((a, b) => 
            new Date(a.split('/').reverse().join('-')) - new Date(b.split('/').reverse().join('-'))
        );

        const ctx = document.getElementById('movementsChart').getContext('2d');
        
        if (this.charts.movements) {
            this.charts.movements.destroy();
        }

        this.charts.movements = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedDates,
                datasets: [{
                    label: 'Movimientos por día',
                    data: sortedDates.map(date => dailyMovements[date]),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    createPlantsChart() {
        const data = this.getFilteredData();
        const movements = data.movements;

        // Contar movimientos por planta
        const plantCounts = { 'Planta 1': 0, 'Planta 2': 0, 'Planta 3': 0 };
        
        movements.forEach(m => {
            if (m.from.includes('plant1') || m.to.includes('plant1') || 
                m.from.includes('planta1') || m.to.includes('planta1')) {
                plantCounts['Planta 1']++;
            }
            if (m.from.includes('plant2') || m.to.includes('plant2') || 
                m.from.includes('planta2') || m.to.includes('planta2')) {
                plantCounts['Planta 2']++;
            }
            if (m.from.includes('plant3') || m.to.includes('plant3') || 
                m.from.includes('planta3') || m.to.includes('planta3')) {
                plantCounts['Planta 3']++;
            }
        });

        const ctx = document.getElementById('plantsChart').getContext('2d');
        
        if (this.charts.plants) {
            this.charts.plants.destroy();
        }

        this.charts.plants = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(plantCounts),
                datasets: [{
                    data: Object.values(plantCounts),
                    backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    createProductsChart() {
        const data = this.getFilteredData();
        const movements = data.movements;

        // Contar productos más utilizados
        const productCounts = {};
        movements.forEach(m => {
            const productName = m.productData?.name || m.productId || 'Desconocido';
            productCounts[productName] = (productCounts[productName] || 0) + 1;
        });

        // Obtener top 10
        const sortedProducts = Object.entries(productCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);

        const ctx = document.getElementById('productsChart').getContext('2d');
        
        if (this.charts.products) {
            this.charts.products.destroy();
        }

        this.charts.products = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedProducts.map(([name]) => name),
                datasets: [{
                    label: 'Usos',
                    data: sortedProducts.map(([,count]) => count),
                    backgroundColor: '#8b5cf6',
                    borderColor: '#7c3aed',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45
                        }
                    }
                }
            }
        });
    }

    createRejectionsChart() {
        const data = this.getFilteredData();
        const rejected = data.rejected;

        // Contar rechazos por motivo
        const rejectionReasons = {};
        rejected.forEach(r => {
            const reason = r.reason || 'Sin especificar';
            rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
        });

        const ctx = document.getElementById('rejectionsChart').getContext('2d');
        
        if (this.charts.rejections) {
            this.charts.rejections.destroy();
        }

        this.charts.rejections = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(rejectionReasons),
                datasets: [{
                    data: Object.values(rejectionReasons),
                    backgroundColor: [
                        '#ef4444', '#f59e0b', '#10b981', '#3b82f6', 
                        '#8b5cf6', '#f97316', '#06b6d4', '#84cc16'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    loadDetailedReports() {
        this.loadMovementsTable();
        this.loadRejectionsTable();
        this.loadEfficiencyTable();
    }

    loadMovementsTable() {
        const data = this.getFilteredData();
        const movements = data.movements.slice(0, 100); // Limitar a 100 para rendimiento

        const tbody = document.getElementById('movementsTableBody');
        tbody.innerHTML = movements.map(m => {
            const product = m.productData || {};
            return `
                <tr>
                    <td>${new Date(m.timestamp).toLocaleDateString('es-ES')}</td>
                    <td>${product.name || m.productId || 'N/A'}</td>
                    <td>${this.formatLocation(m.from)}</td>
                    <td>${this.formatLocation(m.to)}</td>
                    <td>${product.weight ? product.weight + 'kg' : 'N/A'}</td>
                    <td>${product.lot || 'N/A'}</td>
                </tr>
            `;
        }).join('');
    }

    loadRejectionsTable() {
        const data = this.getFilteredData();
        const rejected = data.rejected;

        const tbody = document.getElementById('rejectionsTableBody');
        tbody.innerHTML = rejected.map(r => {
            const materialData = r.materialData || {};
            return `
                <tr>
                    <td>${r.date || 'N/A'}</td>
                    <td>${materialData.name || r.name || 'N/A'}</td>
                    <td>Planta ${r.plantNumber || 'N/A'}</td>
                    <td>${r.reason || 'N/A'}</td>
                    <td>${r.rejectedBy || 'N/A'}</td>
                    <td>${materialData.weight ? materialData.weight + 'kg' : 'N/A'}</td>
                </tr>
            `;
        }).join('');
    }

    loadEfficiencyTable() {
        const data = this.getFilteredData();
        const movements = data.movements;
        const rejected = data.rejected;

        // Calcular por planta
        const plantStats = {};
        
        for (let i = 1; i <= 3; i++) {
            const plantMovements = movements.filter(m => 
                m.from.includes(`plant${i}`) || m.to.includes(`plant${i}`) ||
                m.from.includes(`planta${i}`) || m.to.includes(`planta${i}`)
            );
            
            const plantRejected = rejected.filter(r => r.plantNumber == i);
            
            let totalWeight = 0;
            plantMovements.forEach(m => {
                if (m.productData && m.productData.weight) {
                    totalWeight += parseFloat(m.productData.weight) || 0;
                }
            });

            const successRate = plantMovements.length > 0 ? 
                ((plantMovements.length - plantRejected.length) / plantMovements.length * 100).toFixed(1) : 0;

            plantStats[`Planta ${i}`] = {
                processed: plantMovements.length,
                rejected: plantRejected.length,
                successRate: successRate,
                totalWeight: totalWeight.toFixed(1)
            };
        }

        const tbody = document.getElementById('efficiencyTableBody');
        tbody.innerHTML = Object.entries(plantStats).map(([plant, stats]) => `
            <tr>
                <td>${plant}</td>
                <td>${stats.processed}</td>
                <td>${stats.rejected}</td>
                <td>${stats.successRate}%</td>
                <td>${stats.totalWeight}kg</td>
            </tr>
        `).join('');
    }

    formatLocation(location) {
        if (location.includes('transito')) return 'Tránsito';
        if (location.includes('deposito')) return 'Depósito';
        if (location.includes('plant1') || location.includes('planta1')) return 'Planta 1';
        if (location.includes('plant2') || location.includes('planta2')) return 'Planta 2';
        if (location.includes('plant3') || location.includes('planta3')) return 'Planta 3';
        if (location.includes('Machine')) return location.replace('Machine', 'Máquina ');
        if (location === 'rejected') return 'Rechazado';
        return location;
    }

    getRejectedProducts() {
        return JSON.parse(localStorage.getItem('stockeando_rejected')) || [];
    }

    getInventoryData() {
        return JSON.parse(localStorage.getItem('stockeando_inventory')) || {};
    }

    // Funciones de exportación
    exportToCSV() {
        const data = this.getFilteredData();
        const movements = data.movements;
        
        let csv = 'Fecha,Producto,Desde,Hasta,Peso,Lote\n';
        
        movements.forEach(m => {
            const product = m.productData || {};
            csv += `${new Date(m.timestamp).toLocaleDateString('es-ES')},`;
            csv += `"${product.name || m.productId || 'N/A'}",`;
            csv += `"${this.formatLocation(m.from)}",`;
            csv += `"${this.formatLocation(m.to)}",`;
            csv += `${product.weight || 'N/A'},`;
            csv += `"${product.lot || 'N/A'}"\n`;
        });

        this.downloadFile(csv, 'reporte_movimientos.csv', 'text/csv');
    }

    exportToPDF() {
        window.print();
    }

    printReport() {
        window.print();
    }

    downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }
}

// Funciones globales
function applyFilters() {
    reportsAnalytics.currentFilters.dateFrom = document.getElementById('dateFrom').value;
    reportsAnalytics.currentFilters.dateTo = document.getElementById('dateTo').value;
    reportsAnalytics.currentFilters.plant = document.getElementById('plantFilter').value;
    
    reportsAnalytics.generateStats();
    reportsAnalytics.createCharts();
    reportsAnalytics.loadDetailedReports();
}

function exportToCSV() {
    reportsAnalytics.exportToCSV();
}

function exportToPDF() {
    reportsAnalytics.exportToPDF();
}

function printReport() {
    reportsAnalytics.printReport();
}

// Inicializar cuando se carga la página
let reportsAnalytics;
document.addEventListener('DOMContentLoaded', function() {
    reportsAnalytics = new ReportsAnalytics();
});