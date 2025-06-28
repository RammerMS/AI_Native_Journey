// Training Data Management System
// Handles storage, retrieval, and management of user-submitted drawings

class TrainingDataManager {
    constructor() {
        this.dbName = 'DrawingRecognitionDB';
        this.version = 1;
        this.stores = {
            drawings: 'drawings',
            statistics: 'statistics',
            prompts: 'prompts'
        };
        this.db = null;
        this.initDatabase();
    }

    async initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('Failed to open database:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database initialized successfully');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create drawings store
                if (!db.objectStoreNames.contains(this.stores.drawings)) {
                    const drawingsStore = db.createObjectStore(this.stores.drawings, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    drawingsStore.createIndex('label', 'label', { unique: false });
                    drawingsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    drawingsStore.createIndex('userId', 'userId', { unique: false });
                }

                // Create statistics store
                if (!db.objectStoreNames.contains(this.stores.statistics)) {
                    const statsStore = db.createObjectStore(this.stores.statistics, { 
                        keyPath: 'id' 
                    });
                }

                // Create prompts store
                if (!db.objectStoreNames.contains(this.stores.prompts)) {
                    const promptsStore = db.createObjectStore(this.stores.prompts, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    promptsStore.createIndex('category', 'category', { unique: false });
                }

                console.log('Database schema created');
            };
        });
    }

    // Generate a unique user ID (in a real app, this would be from authentication)
    generateUserId() {
        if (!localStorage.getItem('userId')) {
            localStorage.setItem('userId', 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
        }
        return localStorage.getItem('userId');
    }

    // Save a drawing submission
    async saveDrawing(imageData, label, prompt = null) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        const drawing = {
            imageData: imageData,
            label: label.toLowerCase().trim(),
            prompt: prompt,
            timestamp: Date.now(),
            userId: this.generateUserId(),
            imageSize: {
                width: imageData.width,
                height: imageData.height
            }
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.stores.drawings], 'readwrite');
            const store = transaction.objectStore(this.stores.drawings);
            const request = store.add(drawing);

            request.onsuccess = () => {
                console.log('Drawing saved successfully');
                this.updateStatistics();
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Failed to save drawing:', request.error);
                reject(request.error);
            };
        });
    }

    // Get recent submissions for a user
    async getRecentSubmissions(limit = 10) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.stores.drawings], 'readonly');
            const store = transaction.objectStore(this.stores.drawings);
            const index = store.index('timestamp');
            const request = index.openCursor(null, 'prev');

            const submissions = [];
            const userId = this.generateUserId();

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && submissions.length < limit) {
                    if (cursor.value.userId === userId) {
                        submissions.push({
                            id: cursor.value.id,
                            label: cursor.value.label,
                            timestamp: cursor.value.timestamp,
                            prompt: cursor.value.prompt
                        });
                    }
                    cursor.continue();
                } else {
                    resolve(submissions);
                }
            };

            request.onerror = () => {
                console.error('Failed to get recent submissions:', request.error);
                reject(request.error);
            };
        });
    }

    // Get statistics
    async getStatistics() {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.stores.statistics], 'readonly');
            const store = transaction.objectStore(this.stores.statistics);
            const request = store.get('global');

            request.onsuccess = () => {
                const stats = request.result || {
                    totalSubmissions: 0,
                    todaySubmissions: 0,
                    uniqueUsers: 0,
                    categories: {}
                };
                resolve(stats);
            };

            request.onerror = () => {
                console.error('Failed to get statistics:', request.error);
                reject(request.error);
            };
        });
    }

    // Update statistics
    async updateStatistics() {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            const transaction = this.db.transaction([this.stores.drawings], 'readonly');
            const store = transaction.objectStore(this.stores.drawings);
            const request = store.getAll();

            return new Promise((resolve, reject) => {
                request.onsuccess = async () => {
                    const drawings = request.result;
                    const today = new Date().toDateString();
                    const todayTimestamp = new Date(today).getTime();

                    const stats = {
                        id: 'global',
                        totalSubmissions: drawings.length,
                        todaySubmissions: drawings.filter(d => 
                            new Date(d.timestamp).toDateString() === today
                        ).length,
                        uniqueUsers: new Set(drawings.map(d => d.userId)).size,
                        categories: {},
                        lastUpdated: Date.now()
                    };

                    // Count by category
                    drawings.forEach(drawing => {
                        const label = drawing.label;
                        if (!stats.categories[label]) {
                            stats.categories[label] = 0;
                        }
                        stats.categories[label]++;
                    });

                    // Save updated statistics
                    const statsTransaction = this.db.transaction([this.stores.statistics], 'readwrite');
                    const statsStore = statsTransaction.objectStore(this.stores.statistics);
                    const saveRequest = statsStore.put(stats);

                    saveRequest.onsuccess = () => {
                        console.log('Statistics updated');
                        resolve(stats);
                    };

                    saveRequest.onerror = () => {
                        console.error('Failed to update statistics:', saveRequest.error);
                        reject(saveRequest.error);
                    };
                };

                request.onerror = () => {
                    console.error('Failed to get drawings for statistics:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error updating statistics:', error);
            throw error;
        }
    }

    // Get training prompts
    async getTrainingPrompts() {
        const defaultPrompts = [
            'cat', 'dog', 'house', 'tree', 'car', 'bird', 'fish', 'flower', 'sun', 'moon',
            'star', 'heart', 'cloud', 'rainbow', 'apple', 'banana', 'pizza', 'coffee cup',
            'book', 'chair', 'table', 'laptop', 'phone', 'key', 'door', 'window', 'mountain',
            'ocean', 'beach', 'forest', 'city', 'bridge', 'airplane', 'train', 'bicycle',
            'boat', 'rocket', 'robot', 'alien', 'ghost', 'dragon', 'unicorn', 'castle',
            'tower', 'pyramid', 'volcano', 'island', 'desert', 'snowman', 'umbrella'
        ];

        // In a real implementation, you might load prompts from the database
        // For now, we'll return the default prompts
        return defaultPrompts;
    }

    // Export training data (for AI model training)
    async exportTrainingData() {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.stores.drawings], 'readonly');
            const store = transaction.objectStore(this.stores.drawings);
            const request = store.getAll();

            request.onsuccess = () => {
                const drawings = request.result;
                const trainingData = drawings.map(drawing => ({
                    id: drawing.id,
                    label: drawing.label,
                    imageData: drawing.imageData,
                    timestamp: drawing.timestamp,
                    imageSize: drawing.imageSize
                }));

                resolve(trainingData);
            };

            request.onerror = () => {
                console.error('Failed to export training data:', request.error);
                reject(request.error);
            };
        });
    }

    // Clear all data (for testing/reset)
    async clearAllData() {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.stores.drawings, this.stores.statistics], 'readwrite');
            const drawingsStore = transaction.objectStore(this.stores.drawings);
            const statsStore = transaction.objectStore(this.stores.statistics);

            const drawingsRequest = drawingsStore.clear();
            const statsRequest = statsStore.clear();

            drawingsRequest.onsuccess = () => {
                statsRequest.onsuccess = () => {
                    console.log('All data cleared');
                    resolve();
                };
                statsRequest.onerror = () => reject(statsRequest.error);
            };
            drawingsRequest.onerror = () => reject(drawingsRequest.error);
        });
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrainingDataManager;
} else {
    window.TrainingDataManager = TrainingDataManager;
} 