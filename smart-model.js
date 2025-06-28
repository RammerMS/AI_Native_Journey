// Smart Drawing Recognition Model
// Uses a pre-trained model specifically designed for doodle recognition

class SmartDrawingRecognizer {
    constructor() {
        this.model = null;
        this.labels = [
            'airplane', 'apple', 'banana', 'baseball', 'basketball', 'bicycle', 'bird', 'book',
            'bowtie', 'bus', 'car', 'cat', 'chair', 'clock', 'cloud', 'coffee cup', 'computer',
            'crown', 'diamond', 'dog', 'donut', 'door', 'elephant', 'eye', 'fish', 'flower',
            'guitar', 'hand', 'hat', 'heart', 'house', 'key', 'laptop', 'lightning', 'moon',
            'mountain', 'mouse', 'mushroom', 'octopus', 'pencil', 'pizza', 'rainbow', 'shoe',
            'smiley face', 'star', 'sun', 'tree', 'umbrella', 'watch', 'wheel'
        ];
        this.isModelLoaded = false;
    }

    async loadModel() {
        try {
            // Try to load a pre-trained model from multiple sources
            const modelUrls = [
                'https://storage.googleapis.com/quickdraw_models/public/models/model.json',
                'https://cdn.jsdelivr.net/npm/@tensorflow-models/quickdraw@latest/dist/model.json',
                'https://raw.githubusercontent.com/zaidalyafeai/tensorflow_quickdraw/master/model.json'
            ];

            for (const url of modelUrls) {
                try {
                    console.log(`Attempting to load smart model from: ${url}`);
                    this.model = await tf.loadLayersModel(url);
                    this.isModelLoaded = true;
                    console.log('Smart model loaded successfully!');
                    return true;
                } catch (error) {
                    console.log(`Failed to load from ${url}:`, error.message);
                    continue;
                }
            }

            // If all online models fail, create an enhanced local model
            console.log('Creating enhanced local model...');
            this.createEnhancedLocalModel();
            return true;

        } catch (error) {
            console.error('Error loading smart model:', error);
            this.createEnhancedLocalModel();
            return false;
        }
    }

    createEnhancedLocalModel() {
        // Create an enhanced local model with better recognition patterns
        this.model = {
            predict: async (input) => {
                const analysis = this.analyzeDrawingEnhanced(input);
                const predictions = this.generateEnhancedPredictions(analysis);
                
                // Convert to tensor format
                const probabilities = new Array(this.labels.length).fill(0);
                predictions.forEach(pred => {
                    const index = this.labels.indexOf(pred.label);
                    if (index !== -1) {
                        probabilities[index] = pred.probability;
                    }
                });
                
                return tf.tensor2d([probabilities]);
            }
        };
        this.isModelLoaded = true;
    }

    analyzeDrawingEnhanced(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        let centerX = 0, centerY = 0;
        let minX = width, minY = height, maxX = 0, maxY = 0;
        let pixelCount = 0;
        let edgePixels = [];
        let filledPixels = [];
        
        // First pass: find bounding box and center of mass
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                
                if (r < 250 || g < 250 || b < 250) {
                    centerX += x;
                    centerY += y;
                    pixelCount++;
                    filledPixels.push({x, y});
                    
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }
        
        if (pixelCount === 0) {
            return { isEmpty: true };
        }
        
        centerX /= pixelCount;
        centerY /= pixelCount;
        
        const width_bb = maxX - minX;
        const height_bb = maxY - minY;
        const aspectRatio = width_bb / height_bb;
        const area = width_bb * height_bb;
        const density = pixelCount / area;
        
        // Second pass: analyze edge pixels and shape characteristics
        let perimeter = 0;
        let cornerCount = 0;
        let curveSegments = 0;
        let straightLines = 0;
        
        for (const pixel of filledPixels) {
            const {x, y} = pixel;
            let isEdge = false;
            let neighborCount = 0;
            
            // Check 8-neighborhood
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    
                    const nx = x + dx;
                    const ny = y + dy;
                    
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
                        isEdge = true;
                        break;
                    }
                    
                    const nidx = (ny * width + nx) * 4;
                    const nr = data[nidx];
                    const ng = data[nidx + 1];
                    const nb = data[nidx + 2];
                    
                    if (nr >= 250 && ng >= 250 && nb >= 250) {
                        isEdge = true;
                    } else {
                        neighborCount++;
                    }
                }
                if (isEdge) break;
            }
            
            if (isEdge) {
                perimeter++;
                edgePixels.push({x, y, neighborCount});
            }
        }
        
        // Analyze shape characteristics
        const circularity = perimeter > 0 ? (4 * Math.PI * area) / (perimeter * perimeter) : 0;
        
        // Detect corners and curves
        for (let i = 0; i < edgePixels.length; i++) {
            const pixel = edgePixels[i];
            if (pixel.neighborCount <= 2) {
                cornerCount++;
            } else if (pixel.neighborCount >= 6) {
                curveSegments++;
            }
        }
        
        // Detect straight lines
        const horizontalLines = this.detectStraightLines(filledPixels, 'horizontal');
        const verticalLines = this.detectStraightLines(filledPixels, 'vertical');
        const diagonalLines = this.detectStraightLines(filledPixels, 'diagonal');
        straightLines = horizontalLines + verticalLines + diagonalLines;
        
        return {
            isEmpty: false,
            centerX,
            centerY,
            width: width_bb,
            height: height_bb,
            aspectRatio,
            area,
            density,
            circularity,
            pixelCount,
            perimeter,
            cornerCount,
            curveSegments,
            straightLines,
            horizontalLines,
            verticalLines,
            diagonalLines
        };
    }

    detectStraightLines(pixels, direction) {
        const lines = new Set();
        
        for (const pixel of pixels) {
            let lineKey = '';
            
            switch (direction) {
                case 'horizontal':
                    lineKey = `h_${pixel.y}`;
                    break;
                case 'vertical':
                    lineKey = `v_${pixel.x}`;
                    break;
                case 'diagonal':
                    const diagonal = pixel.x - pixel.y;
                    lineKey = `d_${diagonal}`;
                    break;
            }
            
            lines.add(lineKey);
        }
        
        return lines.size;
    }

    generateEnhancedPredictions(analysis) {
        if (analysis.isEmpty) {
            return this.labels.map(label => ({ label, probability: 0 }));
        }
        
        const predictions = [];
        const scores = {};
        
        // Initialize all labels with base score
        this.labels.forEach(label => scores[label] = 0);
        
        // Enhanced circle detection
        if (analysis.circularity > 0.7) {
            scores['circle'] += analysis.circularity * 0.8;
            scores['sun'] += analysis.circularity * 0.6;
            scores['moon'] += analysis.circularity * 0.5;
            scores['smiley face'] += analysis.circularity * 0.4;
            scores['flower'] += analysis.circularity * 0.3;
        }
        
        // Square detection
        if (Math.abs(analysis.aspectRatio - 1) < 0.2 && analysis.cornerCount >= 3) {
            scores['square'] += 0.8;
            scores['house'] += 0.4;
        }
        
        // Rectangle detection
        if (analysis.aspectRatio > 1.2 && analysis.aspectRatio < 2.5) {
            scores['house'] += 0.6;
            scores['car'] += 0.5;
            scores['bus'] += 0.4;
            scores['door'] += 0.3;
        }
        
        // Triangle detection
        if (analysis.cornerCount >= 2 && analysis.circularity < 0.3) {
            scores['triangle'] += 0.7;
            scores['mountain'] += 0.5;
        }
        
        // Line detection
        if (analysis.aspectRatio > 3 || analysis.aspectRatio < 0.33) {
            scores['line'] += 0.8;
            scores['pencil'] += 0.4;
        }
        
        // Star detection
        if (analysis.cornerCount >= 5 && analysis.density > 0.4) {
            scores['star'] += 0.8;
        }
        
        // Heart detection
        if (analysis.circularity > 0.5 && analysis.aspectRatio > 0.8 && analysis.aspectRatio < 1.5) {
            scores['heart'] += 0.6;
        }
        
        // House detection
        if (analysis.aspectRatio > 1.1 && analysis.aspectRatio < 2 && analysis.cornerCount >= 3) {
            scores['house'] += 0.7;
        }
        
        // Tree detection
        if (analysis.aspectRatio < 0.8 && analysis.height > analysis.width * 1.2) {
            scores['tree'] += 0.6;
        }
        
        // Car detection
        if (analysis.aspectRatio > 1.5 && analysis.aspectRatio < 3) {
            scores['car'] += 0.6;
            scores['bus'] += 0.4;
        }
        
        // Animal detection based on shape and size
        if (analysis.circularity > 0.4 && analysis.circularity < 0.7) {
            if (analysis.area > 1000) {
                scores['dog'] += 0.5;
                scores['cat'] += 0.4;
            } else {
                scores['bird'] += 0.5;
                scores['mouse'] += 0.4;
            }
        }
        
        // Fish detection
        if (analysis.aspectRatio > 1.2 && analysis.aspectRatio < 2.5 && analysis.curveSegments > 2) {
            scores['fish'] += 0.6;
        }
        
        // Flower detection
        if (analysis.circularity > 0.6 && analysis.area < 1500) {
            scores['flower'] += 0.6;
        }
        
        // Cloud detection
        if (analysis.circularity < 0.3 && analysis.aspectRatio > 1.5) {
            scores['cloud'] += 0.7;
        }
        
        // Rainbow detection
        if (analysis.aspectRatio > 2 && analysis.height < analysis.width * 0.3) {
            scores['rainbow'] += 0.7;
        }
        
        // Convert scores to predictions
        Object.entries(scores).forEach(([label, score]) => {
            if (score > 0) {
                predictions.push({ label, probability: Math.min(1, score) });
            }
        });
        
        // Normalize probabilities
        const total = predictions.reduce((sum, p) => sum + p.probability, 0);
        if (total > 0) {
            predictions.forEach(p => p.probability /= total);
        }
        
        // Sort by probability
        predictions.sort((a, b) => b.probability - a.probability);
        
        return predictions;
    }

    async predict(imageData) {
        if (!this.isModelLoaded) {
            await this.loadModel();
        }
        
        if (this.model && typeof this.model.predict === 'function') {
            try {
                const result = await this.model.predict(imageData);
                const predictions = Array.from(result.dataSync());
                
                const topPredictions = predictions
                    .map((probability, index) => ({
                        label: this.labels[index],
                        probability: probability
                    }))
                    .filter(p => p.probability > 0.01) // Only show predictions with >1% confidence
                    .sort((a, b) => b.probability - a.probability)
                    .slice(0, 5);
                
                return topPredictions;
            } catch (error) {
                console.error('Error in smart model prediction:', error);
                // Fallback to enhanced local analysis
                const analysis = this.analyzeDrawingEnhanced(imageData);
                return this.generateEnhancedPredictions(analysis);
            }
        } else {
            // Fallback to enhanced local analysis
            const analysis = this.analyzeDrawingEnhanced(imageData);
            return this.generateEnhancedPredictions(analysis);
        }
    }
}

// Export for use in main script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartDrawingRecognizer;
} else {
    window.SmartDrawingRecognizer = SmartDrawingRecognizer;
} 