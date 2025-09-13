// Gestor de Plantas - Maneja toda la lógica de las plantas y máquinas
class PlantManager {
    constructor() {
        this.machineStorageKey = 'stockeando_machines';
        this.inventoryStorageKey = 'stockeando_inventory';
        this.STATE_TYPES = {
            DEPOSIT: 'deposit',
            MACHINE: 'machine',
            REJECTED: 'rejected',
            TRANSIT: 'transit'
        };
    }

    // Obtener datos del inventario
    getInventoryData() {
        const inventory = JSON.parse(localStorage.getItem(this.inventoryStorageKey)) || {
            pedidos: [],
            transito: [],
            deposito: [],
            planta1: [],
            planta2: [],
            planta3: [],
            eliminados: [],
            rechazados: []
        };
        
        // Solo validar si es necesario (no en cada llamada)
        return inventory;
    }

    // Guardar datos del inventario
    saveInventoryData(data) {
        localStorage.setItem(this.inventoryStorageKey, JSON.stringify(data));
    }
    
    // Validar inventario solo cuando sea necesario
    validateInventoryOnce() {
        const inventory = this.getInventoryData();
        let needsSave = false;
        
        // Verificar que todas las plantas existan
        if (!inventory.planta1) { inventory.planta1 = []; needsSave = true; }
        if (!inventory.planta2) { inventory.planta2 = []; needsSave = true; }
        if (!inventory.planta3) { inventory.planta3 = []; needsSave = true; }
        
        // Solo agregar IDs si no existen
        ['planta1', 'planta2', 'planta3'].forEach(planta => {
            if (inventory[planta] && Array.isArray(inventory[planta])) {
                inventory[planta].forEach(product => {
                    if (!product.id) {
                        product.id = `${product.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        needsSave = true;
                    }
                });
            }
        });
        
        if (needsSave) {
            this.saveInventoryData(inventory);
        }
        
        return inventory;
    }

    // Obtener datos de máquinas
    getMachineData() {
        return JSON.parse(localStorage.getItem(this.machineStorageKey)) || {};
    }

    // Guardar datos de máquinas
    saveMachineData(machineData) {
        localStorage.setItem(this.machineStorageKey, JSON.stringify(machineData));
    }

    // Inicializar plantas
    initializePlants() {
        const inventory = this.getInventoryData();
        
        // Siempre inicializar las plantas vacías
        inventory.planta1 = [];
        inventory.planta2 = [];
        inventory.planta3 = [];
        inventory.deposito = [];
        inventory.pedidos = [];
        inventory.transito = [];
        inventory.eliminados = [];
        inventory.rechazados = [];
        
        // Limpiar datos de máquinas completamente
        const emptyMachineData = {
            'plant1MachineA': [],
            'plant1MachineB': [],
            'plant2MachineA': [],
            'plant2MachineB': [],
            'plant3MachineA': [],
            'plant3MachineB': []
        };
        this.saveMachineData(emptyMachineData);
        
        // Limpiar historial de productos
        productStateManager.clearProductStates();
        
        // No limpiar categorías de productos al reiniciar plantas
        
        // Guardar inventario limpio
        this.saveInventoryData(inventory);
        
        console.log('Plantas y máquinas inicializadas correctamente - todas las secciones vacías');
    }
    
    // Inicializar con validación única
    initializeWithValidation() {
        this.validateInventoryOnce();
        this.removeDuplicates();
        this.fixDuplicateCodes();
        console.log('Inventario validado correctamente');
    }
    
    // Remover duplicados existentes
    removeDuplicates() {
        const inventory = this.getInventoryData();
        let needsSave = false;
        
        ['planta1', 'planta2', 'planta3'].forEach(planta => {
            if (inventory[planta] && Array.isArray(inventory[planta])) {
                const seen = new Set();
                const originalLength = inventory[planta].length;
                
                inventory[planta] = inventory[planta].filter(product => {
                    const key = `${product.name}_${product.lot}_${product.code}`;
                    if (seen.has(key)) {
                        return false;
                    }
                    seen.add(key);
                    return true;
                });
                
                if (inventory[planta].length !== originalLength) {
                    needsSave = true;
                    console.log(`Removidos ${originalLength - inventory[planta].length} duplicados de ${planta}`);
                }
            }
        });
        
        if (needsSave) {
            this.saveInventoryData(inventory);
        }
    }
    
    // Detectar y corregir códigos duplicados
    fixDuplicateCodes() {
        const inventory = this.getInventoryData();
        const codeMap = new Map();
        let needsSave = false;
        
        // Primera pasada: identificar duplicados
        ['deposito', 'planta1', 'planta2', 'planta3'].forEach(location => {
            if (inventory[location]) {
                inventory[location].forEach((product, index) => {
                    if (product.code) {
                        if (codeMap.has(product.code)) {
                            codeMap.get(product.code).push({ location, index, product });
                        } else {
                            codeMap.set(product.code, [{ location, index, product }]);
                        }
                    }
                });
            }
        });
        
        // Segunda pasada: corregir duplicados
        codeMap.forEach((products, code) => {
            if (products.length > 1) {
                console.log(`Código duplicado encontrado: ${code}`);
                // Mantener el primero, regenerar códigos para los demás
                for (let i = 1; i < products.length; i++) {
                    const { location, index, product } = products[i];
                    const newCode = productStateManager.generateUniqueCode(product.name);
                    inventory[location][index].code = newCode;
                    needsSave = true;
                    console.log(`Código ${code} cambiado a ${newCode} en ${location}`);
                }
            }
        });
        
        if (needsSave) {
            this.saveInventoryData(inventory);
            console.log('Códigos duplicados corregidos');
        }
    }

    // Cargar materiales de una planta específica
    loadPlantMaterials(plantNumber) {
        const inventory = this.getInventoryData();
        const materials = inventory[`planta${plantNumber}`] || [];
        const listId = `plant${plantNumber}MaterialsList`;
        const materialsList = document.getElementById(listId);
        
        if (!materialsList) {
            console.warn(`No se encontró el contenedor ${listId}`);
            return;
        }
        
        // Limpiar contenido anterior
        materialsList.innerHTML = '';
        
        if (materials.length === 0) {
            materialsList.innerHTML = '<div class="drop-zone">Arrastra materiales desde el Depósito General</div>';
            return;
        }
        
        // No modificar los materiales aquí para evitar duplicación
        
        materialsList.innerHTML = materials.map((material, index) => `
            <div class="material-item" draggable="true" 
                 ondragstart="plantManager.dragMaterial(event, ${plantNumber}, ${index})" 
                 ondblclick="showPlantMaterialDetails(${plantNumber}, ${index})"
                 data-material="${material.name}">
                <strong>${material.name}</strong><br>
                Peso: ${material.weight}kg | Fecha: ${material.entryDate}
                <br><small>Lote: ${material.lot} | Cód: ${material.code}</small>
                <br><button class="delete-btn" style="font-size: 0.7em; padding: 4px 8px; margin-top: 5px;" 
                           onclick="plantManager.rejectFromDeposit(${plantNumber}, ${index})">Rechazar</button>
            </div>
        `).join('');
    }

    // Manejar drag de materiales
    dragMaterial(event, plantNumber, index) {
        const inventory = this.getInventoryData();
        const material = inventory[`planta${plantNumber}`][index];
        
        event.dataTransfer.setData("materialIndex", index);
        event.dataTransfer.setData("plantNumber", plantNumber);
        event.dataTransfer.setData("source", `plant${plantNumber}deposit`);
        event.dataTransfer.setData("text", material.name);
        event.dataTransfer.setData("materialId", material.id || `${material.name}_${Date.now()}`);
    }

    // Mover material a máquina
    moveToMachine(event, machineId) {
        event.preventDefault();
        event.currentTarget.classList.remove('drag-over');
        
        const source = event.dataTransfer.getData("source");
        const plantNumber = parseInt(event.dataTransfer.getData("plantNumber"));
        const materialIndex = parseInt(event.dataTransfer.getData("materialIndex"));
        const materialName = event.dataTransfer.getData("text");
        const materialId = event.dataTransfer.getData("materialId");
        
        // Verificar que es de un depósito de planta
        if (!source.includes('deposit')) return;
        
        const machineContainer = document.getElementById(`${machineId}-materials`);
        
        // Remover drop zone si existe
        const dropZone = machineContainer.querySelector('.drop-zone');
        if (dropZone) dropZone.remove();

        // Obtener datos completos del material antes de moverlo
        const inventory = this.getInventoryData();
        const material = inventory[`planta${plantNumber}`][materialIndex];
        
        // Registrar movimiento en el sistema de seguimiento con datos completos
        productStateManager.registerMovement(
            materialId,
            `planta${plantNumber}_deposit`,
            `${machineId}`,
            'Movido a máquina para procesamiento'
        );
        
        // Los datos ya fueron obtenidos arriba
        
        // Asegurar que el material tenga un ID único
        if (!material.id) {
            material.id = `${material.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // Crear elemento de material en máquina
        const materialDiv = document.createElement('div');
        materialDiv.className = 'machine-material';
        materialDiv.draggable = true;
        materialDiv.dataset.material = materialName;
        materialDiv.dataset.materialId = material.id;
        materialDiv.innerHTML = `<strong>${materialName}</strong>`;
        materialDiv.ondragstart = (e) => this.dragFromMachine(e, machineId);
        materialDiv.ondblclick = () => this.showMachineProductDetails(materialName, machineId);
        machineContainer.appendChild(materialDiv);
        
        // Remover del depósito
        inventory[`planta${plantNumber}`].splice(materialIndex, 1);
        this.saveInventoryData(inventory);
        
        // Actualizar vista del depósito
        this.loadPlantMaterials(plantNumber);
        
        // Guardar estado de máquinas con datos completos
        this.saveMachineStateWithData(machineId, material);
    }

    // Drag desde máquina
    dragFromMachine(event, machineId) {
        event.dataTransfer.setData("text", event.target.dataset.material);
        event.dataTransfer.setData("materialId", event.target.dataset.materialId);
        event.dataTransfer.setData("source", "machine");
        event.dataTransfer.setData("machineId", machineId);
    }

    // Mover de máquina de vuelta a depósito
    moveToDeposit(event, plantNumber) {
        event.preventDefault();
        event.currentTarget.classList.remove('drag-over');
        
        const source = event.dataTransfer.getData("source");
        if (source !== "machine") {
            console.log('Fuente no válida para depósito:', source);
            return;
        }
        
        const materialName = event.dataTransfer.getData("text");
        const materialId = event.dataTransfer.getData("materialId");
        const machineId = event.dataTransfer.getData("machineId");
        
        // Validar que la máquina pertenece a la planta correcta
        if (!machineId.includes(`plant${plantNumber}`)) {
            console.log('La máquina no pertenece a esta planta');
            return;
        }
        
        // Buscar el material completo en el inventario usando el nombre
        const inventory = this.getInventoryData();
        const plantMaterials = inventory[`planta${plantNumber}`] || [];
        
        // Buscar material por nombre (ya que puede no estar en el depósito)
        let materialData = plantMaterials.find(m => m.name === materialName);
        
        // Si no está en el depósito, crear datos básicos
        if (!materialData) {
            materialData = {
                name: materialName,
                id: materialId,
                measure: 'N/A',
                weight: 0,
                entryDate: new Date().toISOString().split('T')[0],
                lot: 'Machine Return',
                code: `RET-${Date.now()}`
            };
        }
        
        // Agregar de vuelta al depósito de la planta
        inventory[`planta${plantNumber}`].push(materialData);
        this.saveInventoryData(inventory);
        
        // Remover de la máquina
        const machineElement = document.querySelector(`#${machineId}-materials .machine-material[data-material="${materialName}"]`);
        if (machineElement) {
            machineElement.remove();
            this.saveMachineState();
            
            // Registrar movimiento de vuelta al depósito
            productStateManager.registerMovement(
                materialId,
                machineId,
                `planta${plantNumber}_deposit`,
                'Retornado a depósito desde máquina'
            );
        }
        
        // Recargar vista del depósito
        this.loadPlantMaterials(plantNumber);
    }

    // Mostrar detalles de producto en máquina
    showMachineProductDetails(materialName, machineId) {
        // Buscar el material en los datos de la máquina
        const machineData = this.getMachineData();
        let materialData = null;
        
        if (machineData[machineId]) {
            materialData = machineData[machineId].find(m => m.name === materialName);
        }
        
        // Si no se encuentra en la máquina, buscar en inventario como fallback
        if (!materialData) {
            const inventory = this.getInventoryData();
            ['planta1', 'planta2', 'planta3'].forEach(planta => {
                if (inventory[planta]) {
                    const found = inventory[planta].find(m => m.name === materialName);
                    if (found) materialData = found;
                }
            });
        }
        
        // Si aún no se encuentra, crear datos básicos
        if (!materialData) {
            materialData = {
                name: materialName,
                measure: 'N/A',
                weight: 'N/A',
                entryDate: 'N/A',
                lot: 'N/A',
                code: 'N/A'
            };
        }
        
        // Determinar número de planta desde machineId
        const plantNumber = machineId.includes('plant1') ? 1 : 
                           machineId.includes('plant2') ? 2 : 
                           machineId.includes('plant3') ? 3 : 'N/A';
        
        // Calcular fecha de vencimiento
        let expirationDate = 'No definido';
        if (materialData.entryDate && materialData.entryDate !== 'N/A') {
            const entry = new Date(materialData.entryDate);
            entry.setMonth(entry.getMonth() + 6);
            expirationDate = entry.toLocaleDateString('es-ES');
        }
        
        const detailsModal = document.createElement('div');
        detailsModal.className = 'rejection-modal';
        detailsModal.style.display = 'block';
        detailsModal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <h3>⚙️ Material en Máquina - ${machineId}</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
                    <div>
                        <p><strong>📦 Producto:</strong> ${materialData.name}</p>
                        <p><strong>📏 Medida:</strong> ${materialData.measure}</p>
                        <p><strong>⚖️ Peso:</strong> ${materialData.weight}kg</p>
                        <p><strong>📅 Fecha Ingreso:</strong> ${materialData.entryDate}</p>
                    </div>
                    <div>
                        <p><strong>🏷️ Lote:</strong> ${materialData.lot}</p>
                        <p><strong>🔢 Código:</strong> ${materialData.code}</p>
                        <p><strong>⏰ Vencimiento:</strong> ${expirationDate}</p>
                        <p><strong>📍 Ubicación:</strong> Planta ${plantNumber} - Máquina</p>
                    </div>
                </div>
                ${materialData.qrUrl ? `
                    <div style="text-align: center; margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                        <h4>📱 Código QR</h4>
                        <img src="${materialData.qrUrl}" alt="QR Code" style="border: 2px solid #ddd; border-radius: 8px; margin: 10px 0;">
                        <div style="font-size: 0.9em; color: #666; margin-top: 10px;">
                            <strong>Información del QR:</strong><br>
                            ${materialData.name}<br>
                            Peso: ${materialData.weight}kg | Fecha: ${materialData.entryDate}<br>
                            Lote: ${materialData.lot} | Código: ${materialData.code}
                        </div>
                    </div>
                ` : '<div style="text-align: center; padding: 20px; color: #999;">📱 No hay código QR disponible</div>'}
                <div style="text-align: center; margin-top: 20px;">
                    <button class="modal-btn cancel" onclick="this.closest('.rejection-modal').remove()">Cerrar</button>
                    ${materialData.qrUrl ? `<button class="modal-btn" onclick="downloadProductQR('${materialData.name}', '${materialData.lot}', '${materialData.qrUrl}')">📥 Descargar QR</button>` : ''}
                </div>
            </div>
        `;
        document.body.appendChild(detailsModal);
    }
    
    // Guardar estado de máquina con datos completos del material
    saveMachineStateWithData(machineId, materialData) {
        const machineData = this.getMachineData();
        
        if (!machineData[machineId]) {
            machineData[machineId] = [];
        }
        
        // Agregar material con todos sus datos
        machineData[machineId].push({
            ...materialData, // Copiar todos los datos del material
            machineEntryDate: new Date().toISOString().split('T')[0] // Agregar fecha de entrada a máquina
        });
        
        this.saveMachineData(machineData);
    }
    
    // Guardar estado actual de todas las máquinas
    saveMachineState() {
        const machineData = {};
        const machineIds = ['plant1MachineA', 'plant1MachineB', 'plant2MachineA', 'plant2MachineB', 'plant3MachineA', 'plant3MachineB'];
        
        machineIds.forEach(machineId => {
            const container = document.getElementById(`${machineId}-materials`);
            if (container) {
                const materials = [];
                container.querySelectorAll('.machine-material').forEach(material => {
                    materials.push({
                        name: material.dataset.material,
                        id: material.dataset.materialId
                    });
                });
                machineData[machineId] = materials;
            }
        });
        
        this.saveMachineData(machineData);
    }

    // Cargar estado de máquinas
    loadMachineState() {
        const machineData = this.getMachineData();
        
        Object.keys(machineData).forEach(machineId => {
            const container = document.getElementById(`${machineId}-materials`);
            if (container) {
                // Limpiar completamente el contenedor
                container.innerHTML = '';
                
                if (machineData[machineId] && machineData[machineId].length > 0) {
                    // Agregar materiales guardados
                    machineData[machineId].forEach(material => {
                        // Compatibilidad con datos antiguos (solo string) y nuevos (objeto)
                        const materialName = typeof material === 'string' ? material : material.name;
                        const materialId = typeof material === 'string' ? `${material}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : (material.id || `${materialName}_${Date.now()}`);
                        
                        const materialDiv = document.createElement('div');
                        materialDiv.className = 'machine-material';
                        materialDiv.draggable = true;
                        materialDiv.dataset.material = materialName;
                        materialDiv.dataset.materialId = materialId;
                        materialDiv.innerHTML = `<strong>${materialName}</strong>`;
                        materialDiv.ondragstart = (e) => this.dragFromMachine(e, machineId);
                        materialDiv.ondblclick = () => this.showMachineProductDetails(materialName, machineId);
                        container.appendChild(materialDiv);
                    });
                } else {
                    // Agregar drop zone si no hay materiales
                    container.innerHTML = '<div class="drop-zone">Arrastra materiales aquí</div>';
                }
            }
        });
    }

    // Rechazar material desde depósito
    rejectFromDeposit(plantNumber, index) {
        const inventory = this.getInventoryData();
        const material = inventory[`planta${plantNumber}`][index];
        
        // Configurar rechazo pendiente
        window.pendingRejection = {
            materialName: material.name,
            plantNumber: plantNumber,
            materialIndex: index,
            materialData: material,
            materialId: material.id
        };
        
        // Mostrar modal para razón de rechazo
        document.getElementById('rejectedMaterialName').textContent = material.name;
        document.getElementById('rejectionModal').style.display = 'block';
        
        // Preparar el modal para capturar la razón del rechazo
        const reasonInput = document.getElementById('rejectionReason');
        if (!reasonInput) {
            const modalContent = document.querySelector('.modal-content');
            const reasonDiv = document.createElement('div');
            reasonDiv.innerHTML = `
                <label for="rejectionReason">Razón del rechazo:</label>
                <textarea id="rejectionReason" rows="3" style="width: 100%; margin: 10px 0;"></textarea>
            `;
            modalContent.insertBefore(reasonDiv, modalContent.lastElementChild);
        }
    }
}

// Crear instancia global
const plantManager = new PlantManager();