// ocr.js - Lógica de OCR para frontend
// Comunicación con API en la nube: https://ocrimpel-1032775540289.us-central1.run.app/ocr

class OCRProcessor {
    constructor() {
        this.fileInput = document.getElementById('fileInput');
        this.dropArea = document.getElementById('dropArea');
        this.processBtn = document.getElementById('processBtn');
        this.statusDiv = document.getElementById('status');
        this.resultDiv = document.getElementById('result');
        this.fileInfo = document.getElementById('fileInfo');
        this.documentTypeSelect = document.getElementById('documentType');
        
        this.initEventListeners();
    }

    initEventListeners() {
        this.dropArea.addEventListener('click', () => {
            this.fileInput.click();
        });
        
        this.dropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropArea.style.borderColor = '#2980b9';
            this.dropArea.style.background = '#e3f2fd';
        });

        this.dropArea.addEventListener('dragleave', () => {
            this.dropArea.style.borderColor = '#3498db';
            this.dropArea.style.background = '#f8fafc';
        });

        this.dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropArea.style.borderColor = '#3498db';
            this.dropArea.style.background = '#f8fafc';
            if (e.dataTransfer.files.length) {
                this.fileInput.files = e.dataTransfer.files;
                this.updateFileInfo(e.dataTransfer.files[0]);
            }
        });

        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                this.updateFileInfo(e.target.files[0]);
            }
        });
    }

    updateFileInfo(file) {
        if (file) {
            this.fileInfo.innerHTML = `
                📄 Archivo seleccionado: <strong>${file.name}</strong><br>
                📏 Tamaño: <strong>${(file.size / 1024).toFixed(2)} KB</strong>
            `;
        }
    }

    async processFile() {
        const file = this.fileInput.files[0];
        if (!file) {
            alert('❌ Por favor, selecciona un archivo PDF o imagen.');
            return;
        }

        const documentType = this.documentTypeSelect.value;
        if (!documentType) {
            alert('❌ Por favor, selecciona un tipo de documento.');
            return;
        }

        // Reset UI
        this.setStatus('⏳ Leyendo archivo...', 'loading');
        this.resultDiv.textContent = '';
        this.processBtn.disabled = true;

        try {
            const base64String = await this.fileToBase64(file);
            console.log('✅ Archivo convertido a base64. Longitud:', base64String.length);
            
            if (base64String.length === 0) {
                throw new Error('El archivo está vacío');
            }

            // 🔍 LOG DETALLADO
            const payload = {
                image_base64: base64String,
                filename: file.name,
                document_type: documentType
            };

            console.log('📤 Enviando a la API los siguientes datos:');
            console.log('   - Tipo de documento:', documentType);
            console.log('   - Nombre del archivo:', file.name);
            console.log('   - Tamaño base64:', base64String.length, 'caracteres');
            console.log('   - Muestra base64 (primeros 100 chars):', base64String.substring(0, 100) + '...');
            console.log('   - Payload completo (objeto):', payload);

            this.setStatus('🤖 Procesando con OCR (puede tardar hasta 3 minutos)...', 'loading');

            const startTime = Date.now();
            const response = await fetch('https://ocrimpel-1032775540289.us-central1.run.app/ocr', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📥 Respuesta del servidor:', data);

            this.setStatus(`✅ ¡Procesado! (${elapsed}s)`, 'success');

            // ✅ MOSTRAR DATOS ESTRUCTURADOS EN LUGAR DE extracted_text
            const fields = data.structured_data?.fields || {};
            let formattedText = '';

            for (const [key, value] of Object.entries(fields)) {
                formattedText += `<strong>${key}:</strong> ${this.escapeHtml(value)}<br>`;
            }

            if (!formattedText) {
                formattedText = '<em>No se extrajeron campos estructurados.</em>';
            }

            this.resultDiv.innerHTML = `
                <strong>🔍 Datos estructurados extraídos:</strong><br><br>
                ${formattedText}
            `;

        } catch (error) {
            console.error('❌ Error en OCR:', error);
            this.setStatus(`❌ Error: ${error.message}`, 'error');
            this.resultDiv.textContent = 'No se pudo procesar el archivo. Revisa la consola para más detalles.';
        } finally {
            this.processBtn.disabled = false;
        }
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const uint8Array = new Uint8Array(arrayBuffer);
                    let binary = '';
                    for (let i = 0; i < uint8Array.length; i++) {
                        binary += String.fromCharCode(uint8Array[i]);
                    }
                    const base64String = btoa(binary);
                    resolve(base64String);
                } catch (error) {
                    reject(new Error('Error al convertir archivo a base64'));
                }
            };

            reader.onerror = () => {
                reject(new Error('Error al leer el archivo'));
            };

            reader.readAsArrayBuffer(file);
        });
    }

    setStatus(message, type) {
        this.statusDiv.textContent = message;
        this.statusDiv.className = `status ${type}`;
        this.statusDiv.style.display = 'block';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.ocrProcessor = new OCRProcessor();
});

// document.addEventListener('DOMContentLoaded', () => {
//     window.ocrProcessor = new OCRProcessor();
// });