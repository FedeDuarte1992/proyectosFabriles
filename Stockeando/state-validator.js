class StateValidator {
    static validateInventoryState(inventory) {
        // Verificar que todas las plantas existan
        if (!inventory.planta1) inventory.planta1 = [];
        if (!inventory.planta2) inventory.planta2 = [];
        if (!inventory.planta3) inventory.planta3 = [];
        
        // Verificar que todos los productos tengan ID único (solo si no lo tienen)
        ['planta1', 'planta2', 'planta3'].forEach(planta => {
            if (inventory[planta] && Array.isArray(inventory[planta])) {
                inventory[planta].forEach(product => {
                    if (!product.id) {
                        product.id = `${product.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    }
                });
            }
        });
        
        return inventory;
    }
    
    static validateMachineState(machineData, inventory) {
        const validMachineIds = ['plant1MachineA', 'plant1MachineB', 'machineA', 'machineB', 'plant3MachineA', 'plant3MachineB'];
        
        // Limpiar datos de máquinas inválidos
        Object.keys(machineData).forEach(machineId => {
            if (!validMachineIds.includes(machineId)) {
                delete machineData[machineId];
            }
        });
        
        // Verificar que los productos en las máquinas existen en el inventario
        validMachineIds.forEach(machineId => {
            if (machineData[machineId]) {
                machineData[machineId] = machineData[machineId].filter(material => {
                    const plantNumber = machineId.includes('plant1') ? 1 : 
                                      machineId.includes('plant3') ? 3 : 2;
                    
                    // Verificar si el material existe en el inventario de la planta
                    const exists = inventory[`planta${plantNumber}`].some(
                        p => p.id === material.id || p.name === material.name
                    );
                    
                    if (!exists) {
                        console.log(`Material inválido removido de ${machineId}:`, material);
                    }
                    return exists;
                });
            }
        });
        
        return machineData;
    }
}

// Exportar la clase para su uso
window.StateValidator = StateValidator;
