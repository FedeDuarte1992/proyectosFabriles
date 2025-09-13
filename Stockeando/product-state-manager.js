class ProductStateManager {
    constructor() {
        this.storageKey = 'stockeando_product_states';
        this.movementsKey = 'stockeando_movements';
    }
    
    // Limpiar historial de productos
    clearProductStates() {
        localStorage.removeItem(this.storageKey);
    }

    // Obtener todos los movimientos
    getAllMovements() {
        return JSON.parse(localStorage.getItem(this.movementsKey)) || [];
    }

    // Guardar movimiento
    saveMovement(movement) {
        const movements = this.getAllMovements();
        movements.push({
            ...movement,
            timestamp: new Date().toISOString(),
            id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
        localStorage.setItem(this.movementsKey, JSON.stringify(movements));
    }
    
    // Obtener todos los datos del inventario
    getAllData() {
        return JSON.parse(localStorage.getItem('stockeando_inventory')) || {};
    }

    // Obtener datos completos del producto desde el inventario
    getCompleteProductData(productId) {
        const inventory = JSON.parse(localStorage.getItem('stockeando_inventory')) || {};
        const locations = ['deposito', 'planta1', 'planta2', 'planta3', 'transito', 'pedidos'];
        
        for (const location of locations) {
            if (inventory[location]) {
                const product = inventory[location].find(p => p.id === productId);
                if (product) return product;
            }
        }
        
        // Buscar en máquinas (tanto en inventario como en almacenamiento separado)
        if (inventory.machines) {
            for (const machine of Object.keys(inventory.machines)) {
                const product = inventory.machines[machine].find(p => p.id === productId);
                if (product) return product;
            }
        }
        
        // Buscar en datos de máquinas almacenados por separado
        const machineData = JSON.parse(localStorage.getItem('stockeando_machines')) || {};
        for (const machineId of Object.keys(machineData)) {
            if (machineData[machineId] && Array.isArray(machineData[machineId])) {
                const product = machineData[machineId].find(p => p.id === productId);
                if (product) return product;
            }
        }
        
        // Buscar en rechazados
        if (inventory.rejected) {
            for (const plant of Object.keys(inventory.rejected)) {
                const product = inventory.rejected[plant].find(p => p.id === productId);
                if (product) return product;
            }
        }
        
        return null;
    }

    // Registrar movimiento con detalles completos
    registerMovement(productId, from, to, reason = '', details = {}) {
        const states = this.getProductStates();
        if (!states[productId]) {
            states[productId] = {
                currentLocation: to,
                history: []
            };
        }

        // Obtener datos completos del producto
        const productData = this.getCompleteProductData(productId);
        const currentUser = localStorage.getItem('stockeando_user') || 'sistema';
        
        const movement = {
            productId,
            from,
            to,
            reason,
            productData: productData, // Guardar datos completos del producto
            user: currentUser, // Agregar usuario que realizó el movimiento
            ...details
        };

        // Guardar en el historial del producto
        states[productId].history.push({
            ...movement,
            timestamp: new Date().toISOString()
        });
        states[productId].currentLocation = to;
        this.saveProductStates(states);

        // Guardar en el registro general de movimientos
        this.saveMovement(movement);
    }

    // Obtener el estado actual de todos los productos
    getProductStates() {
        return JSON.parse(localStorage.getItem(this.storageKey)) || {};
    }

    // Guardar estados de productos
    saveProductStates(states) {
        localStorage.setItem(this.storageKey, JSON.stringify(states));
    }



    // Obtener historial de un producto
    getProductHistory(productId) {
        const states = this.getProductStates();
        return states[productId]?.history || [];
    }

    // Obtener ubicación actual de un producto
    getCurrentLocation(productId) {
        const states = this.getProductStates();
        return states[productId]?.currentLocation;
    }

    // Registrar rechazo de producto
    registerRejection(productId, from, reason, rejectedBy = '') {
        const currentUser = localStorage.getItem('stockeando_user') || 'sistema';
        this.registerMovement(productId, from, 'rejected', reason, {
            rejectedBy,
            rejectionDate: new Date().toISOString().split('T')[0],
            user: currentUser
        });
    }
    
    // Obtener estadísticas de movimientos
    getMovementStats() {
        const movements = this.getAllMovements();
        const today = new Date().toISOString().split('T')[0];
        
        return {
            total: movements.length,
            today: movements.filter(m => m.timestamp.startsWith(today)).length,
            rejected: movements.filter(m => m.to === 'rejected').length,
            byLocation: movements.reduce((acc, m) => {
                acc[m.to] = (acc[m.to] || 0) + 1;
                return acc;
            }, {})
        };
    }
    
    // Limpiar movimientos antiguos (más de 30 días)
    cleanOldMovements() {
        const movements = this.getAllMovements();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const filteredMovements = movements.filter(movement => {
            const movementDate = new Date(movement.timestamp);
            return movementDate >= thirtyDaysAgo;
        });
        
        localStorage.setItem(this.movementsKey, JSON.stringify(filteredMovements));
        return movements.length - filteredMovements.length;
    }
    
    // Exportar datos para backup
    exportData() {
        return {
            productStates: this.getProductStates(),
            movements: this.getAllMovements(),
            exportDate: new Date().toISOString()
        };
    }
    
    // Importar datos desde backup
    importData(data) {
        if (data.productStates) {
            localStorage.setItem(this.storageKey, JSON.stringify(data.productStates));
        }
        if (data.movements) {
            localStorage.setItem(this.movementsKey, JSON.stringify(data.movements));
        }
    }
    
    // Validar que un código sea único en todo el sistema
    isCodeUnique(code) {
        const inventory = JSON.parse(localStorage.getItem('stockeando_inventory')) || {};
        const locations = ['deposito', 'planta1', 'planta2', 'planta3', 'transito', 'pedidos'];
        
        for (const location of locations) {
            if (inventory[location]) {
                const found = inventory[location].some(product => product.code === code);
                if (found) return false;
            }
        }
        return true;
    }
    
    // Generar código único garantizado
    generateUniqueCode(productName) {
        const prefix = productName.substring(0, 2).toUpperCase();
        const today = new Date();
        const dateStr = `${today.getDate().toString().padStart(2, '0')}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getFullYear().toString().slice(-2)}`;
        
        let counter = parseInt(localStorage.getItem('daily_counter') || '0');
        let code;
        
        do {
            const letter = String.fromCharCode(65 + (counter % 26));
            const suffix = counter >= 26 ? Math.floor(counter / 26) : '';
            code = `${prefix}-${dateStr}-${letter}${suffix}`;
            counter++;
        } while (!this.isCodeUnique(code));
        
        localStorage.setItem('daily_counter', counter.toString());
        return code;
    }
}

// Crear instancia global
const productStateManager = new ProductStateManager();
