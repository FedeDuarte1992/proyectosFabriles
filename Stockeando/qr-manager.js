class QRManager {
    constructor() {
        this.qrStorageKey = 'stockeando_qr_codes';
    }

    getStoredQRCodes() {
        return JSON.parse(localStorage.getItem(this.qrStorageKey)) || [];
    }

    saveQRCode(qrData) {
        const codes = this.getStoredQRCodes();
        codes.push({
            ...qrData,
            generatedAt: new Date().toISOString(),
            qrId: `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
        localStorage.setItem(this.qrStorageKey, JSON.stringify(codes));
    }

    generateProductQRData(product) {
        const qrData = {
            id: product.id || `${product.name}_${Date.now()}`,
            name: product.name,
            measure: product.measure,
            weight: product.weight,
            lot: product.lot,
            code: product.code,
            entryDate: product.entryDate,
            location: product.currentLocation,
            lastMovement: product.lastMovement,
            metadata: {
                createdAt: new Date().toISOString(),
                version: '1.0'
            }
        };

        this.saveQRCode(qrData);
        return JSON.stringify(qrData);
    }

    generateQRCode(element, data) {
        // Limpiar elemento anterior si existe
        element.innerHTML = '';
        
        // Generar nuevo QR
        new QRCode(element, {
            text: typeof data === 'string' ? data : JSON.stringify(data),
            width: 256,
            height: 256,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }
}

// Crear instancia global
const qrManager = new QRManager();
