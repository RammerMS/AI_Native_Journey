// Simple local drawing recognition model
// This model uses basic image analysis to recognize simple shapes and objects

class SimpleDrawingRecognizer {
    constructor() {
        this.labels = [
            'circle', 'square', 'triangle', 'line', 'star', 'heart', 
            'smiley', 'house', 'tree', 'car', 'cat', 'dog', 'bird',
            'fish', 'flower', 'sun', 'moon', 'cloud', 'rainbow'
        ];
    }

    // Analyze the drawing and return predictions
    async predict(imageData) {
        const analysis = this.analyzeDrawing(imageData);
        return this.generatePredictions(analysis);
    }

    // Analyze the drawing characteristics
    analyzeDrawing(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        let totalPixels = 0;
        let centerX = 0, centerY = 0;
        let minX = width, minY = height, maxX = 0, maxY = 0;
        let pixelCount = 0;
        
        // Find bounding box and center of mass
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                
                // Check if pixel is not white (has drawing)
                if (r < 250 || g < 250 || b < 250) {
                    centerX += x;
                    centerY += y;
                    pixelCount++;
                    
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
        
        // Calculate circularity
        let perimeter = 0;
        let circularity = 0;
        
        // Simple perimeter calculation
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (x < 0 || x >= width || y < 0 || y >= height) continue;
                
                const idx = (y * width + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                
                if (r < 250 || g < 250 || b < 250) {
                    // Check if this pixel is on the edge
                    let isEdge = false;
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
                                break;
                            }
                        }
                        if (isEdge) break;
                    }
                    
                    if (isEdge) {
                        perimeter++;
                    }
                }
            }
        }
        
        if (perimeter > 0) {
            circularity = (4 * Math.PI * area) / (perimeter * perimeter);
        }
        
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
            pixelCount
        };
    }

    // Generate predictions based on analysis
    generatePredictions(analysis) {
        if (analysis.isEmpty) {
            return this.labels.map(label => ({ label, probability: 0 }));
        }
        
        const predictions = [];
        
        // Circle detection
        const circleScore = Math.min(1, analysis.circularity * 2);
        predictions.push({ label: 'circle', probability: circleScore });
        
        // Square detection
        const squareScore = Math.min(1, (1 - Math.abs(analysis.aspectRatio - 1)) * 2);
        predictions.push({ label: 'square', probability: squareScore });
        
        // Triangle detection
        const triangleScore = Math.min(1, (1 - analysis.circularity) * 0.8);
        predictions.push({ label: 'triangle', probability: triangleScore });
        
        // Line detection
        const lineScore = Math.min(1, (analysis.aspectRatio > 3 || analysis.aspectRatio < 0.33) ? 0.9 : 0.1);
        predictions.push({ label: 'line', probability: lineScore });
        
        // Star detection (high density, medium circularity)
        const starScore = Math.min(1, analysis.density * 0.5 + (1 - analysis.circularity) * 0.3);
        predictions.push({ label: 'star', probability: starScore });
        
        // Heart detection (medium circularity, specific aspect ratio)
        const heartScore = Math.min(1, analysis.circularity * 0.7 + (1 - Math.abs(analysis.aspectRatio - 1.2)) * 0.3);
        predictions.push({ label: 'heart', probability: heartScore });
        
        // Smiley detection (high circularity, medium size)
        const smileyScore = Math.min(1, analysis.circularity * 0.8 + (analysis.area > 1000 ? 0.2 : 0));
        predictions.push({ label: 'smiley', probability: smileyScore });
        
        // House detection (rectangular, wider than tall)
        const houseScore = Math.min(1, (analysis.aspectRatio > 1.2 && analysis.aspectRatio < 2) ? 0.7 : 0.1);
        predictions.push({ label: 'house', probability: houseScore });
        
        // Tree detection (tall, medium density)
        const treeScore = Math.min(1, (analysis.aspectRatio < 0.8 && analysis.density > 0.3) ? 0.6 : 0.1);
        predictions.push({ label: 'tree', probability: treeScore });
        
        // Car detection (wide, medium height)
        const carScore = Math.min(1, (analysis.aspectRatio > 1.5 && analysis.aspectRatio < 3) ? 0.6 : 0.1);
        predictions.push({ label: 'car', probability: carScore });
        
        // Cat detection (medium circularity, medium size)
        const catScore = Math.min(1, analysis.circularity * 0.6 + (analysis.area > 500 ? 0.2 : 0));
        predictions.push({ label: 'cat', probability: catScore });
        
        // Dog detection (similar to cat but larger)
        const dogScore = Math.min(1, analysis.circularity * 0.5 + (analysis.area > 800 ? 0.3 : 0));
        predictions.push({ label: 'dog', probability: dogScore });
        
        // Bird detection (small, medium circularity)
        const birdScore = Math.min(1, analysis.circularity * 0.7 + (analysis.area < 1000 ? 0.3 : 0));
        predictions.push({ label: 'bird', probability: birdScore });
        
        // Fish detection (medium aspect ratio, medium circularity)
        const fishScore = Math.min(1, (analysis.aspectRatio > 1.2 && analysis.aspectRatio < 2.5) ? 0.5 : 0.1);
        predictions.push({ label: 'fish', probability: fishScore });
        
        // Flower detection (high circularity, small to medium size)
        const flowerScore = Math.min(1, analysis.circularity * 0.8 + (analysis.area < 1500 ? 0.2 : 0));
        predictions.push({ label: 'flower', probability: flowerScore });
        
        // Sun detection (high circularity, medium to large size)
        const sunScore = Math.min(1, analysis.circularity * 0.9 + (analysis.area > 800 ? 0.1 : 0));
        predictions.push({ label: 'sun', probability: sunScore });
        
        // Moon detection (high circularity, medium size)
        const moonScore = Math.min(1, analysis.circularity * 0.8 + (analysis.area > 500 && analysis.area < 1500 ? 0.2 : 0));
        predictions.push({ label: 'moon', probability: moonScore });
        
        // Cloud detection (low circularity, wide)
        const cloudScore = Math.min(1, (1 - analysis.circularity) * 0.7 + (analysis.aspectRatio > 1.5 ? 0.3 : 0));
        predictions.push({ label: 'cloud', probability: cloudScore });
        
        // Rainbow detection (wide, low height, curved)
        const rainbowScore = Math.min(1, (analysis.aspectRatio > 2 && analysis.height < analysis.width * 0.3) ? 0.6 : 0.1);
        predictions.push({ label: 'rainbow', probability: rainbowScore });
        
        // Normalize probabilities
        const total = predictions.reduce((sum, p) => sum + p.probability, 0);
        if (total > 0) {
            predictions.forEach(p => p.probability /= total);
        }
        
        // Sort by probability
        predictions.sort((a, b) => b.probability - a.probability);
        
        return predictions;
    }
}

// Export for use in main script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimpleDrawingRecognizer;
} else {
    window.SimpleDrawingRecognizer = SimpleDrawingRecognizer;
} 