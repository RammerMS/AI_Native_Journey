const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const clearButton = document.getElementById('clearButton');
const undoButton = document.getElementById('undoButton');
const guessButton = document.getElementById('guessButton');
const predictionResult = document.getElementById('predictionResult');
const modelTypeInputs = document.querySelectorAll('input[name="modelType"]');

let isDrawing = false;
let model; // To store the loaded TensorFlow.js model
let localModel; // Local simple model
let smartModel; // Smart enhanced model
let currentModelType = 'smart'; // Default to smart model

// Drawing history for undo functionality
let drawingHistory = [];
let currentStep = -1;
const maxHistorySteps = 50; // Limit history to prevent memory issues

// Animated ellipsis functionality
let ellipsisInterval;

function createAnimatedEllipsis() {
    const ellipsis = document.createElement('div');
    ellipsis.className = 'animated-ellipsis';
    ellipsis.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    return ellipsis;
}

function showAnimatedEllipsis() {
    predictionResult.innerHTML = '';
    const ellipsis = createAnimatedEllipsis();
    predictionResult.appendChild(ellipsis);
}

function hideAnimatedEllipsis() {
    if (ellipsisInterval) {
        clearInterval(ellipsisInterval);
        ellipsisInterval = null;
    }
}

// --- Drawing Functionality ---

function setupCanvas() {
    ctx.fillStyle = 'white'; // Set initial canvas background to white
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Fill the canvas
    ctx.strokeStyle = 'black'; // Drawing color is black
    ctx.lineWidth = 15; // Adjust for desired line thickness (thicker for doodles)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
}

function saveCanvasState() {
    // Save current canvas state to history
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Remove any steps after current position (if we're in the middle of history)
    if (currentStep < drawingHistory.length - 1) {
        drawingHistory = drawingHistory.slice(0, currentStep + 1);
    }
    
    // Add new state
    drawingHistory.push(imageData);
    currentStep++;
    
    // Limit history size
    if (drawingHistory.length > maxHistorySteps) {
        drawingHistory.shift();
        currentStep--;
    }
    
    // Update undo button state
    updateUndoButton();
}

function undo() {
    if (currentStep > 0) {
        currentStep--;
        const previousState = drawingHistory[currentStep];
        ctx.putImageData(previousState, 0, 0);
        updateUndoButton();
    } else if (currentStep === 0) {
        // Clear to initial state
        setupCanvas();
        currentStep = -1;
        updateUndoButton();
    }
}

function updateUndoButton() {
    // Enable/disable undo button based on history
    if (currentStep > 0) {
        undoButton.disabled = false;
        undoButton.style.opacity = '1';
        undoButton.style.cursor = 'pointer';
    } else {
        undoButton.disabled = true;
        undoButton.style.opacity = '0.5';
        undoButton.style.cursor = 'not-allowed';
    }
}

function startDrawing(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y); // Start a new path at the current mouse position
    
    // Show animated ellipsis when drawing starts
    showAnimatedEllipsis();
}

function stopDrawing() {
    isDrawing = false;
    ctx.beginPath(); // Reset path after lifting mouse
    // Save the current state after drawing stops
    saveCanvasState();
}

function draw(e) {
    if (!isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
}

// Event Listeners for Drawing
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing); // Stop drawing if mouse leaves canvas
canvas.addEventListener('mousemove', draw);

clearButton.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setupCanvas(); // Re-fill with white
    // Clear history and save initial state
    drawingHistory = [];
    currentStep = -1;
    saveCanvasState();
    showAnimatedEllipsis();
});

undoButton.addEventListener('click', () => {
    undo();
});

guessButton.addEventListener('click', () => {
    predictDrawing();
});

// Model type change handler
modelTypeInputs.forEach(input => {
    input.addEventListener('change', (e) => {
        currentModelType = e.target.value;
        if (currentModelType === 'local') {
            showAnimatedEllipsis();
        } else if (currentModelType === 'smart') {
            showAnimatedEllipsis();
        } else if (currentModelType === 'online') {
            showAnimatedEllipsis();
            loadOnlineModel();
        } else if (currentModelType === 'azure') {
            showAnimatedEllipsis();
        } else if (currentModelType === 'google') {
            showAnimatedEllipsis();
        }
    });
});

// Initialize canvas
setupCanvas();
saveCanvasState(); // Save initial blank state

// --- AI Model Loading and Prediction ---

// Define the class labels directly to avoid network issues
const CLASS_LABELS = [
    'airplane', 'apple', 'banana', 'baseball', 'basketball', 'bicycle', 'bird', 'book',
    'bowtie', 'bus', 'car', 'cat', 'chair', 'clock', 'cloud', 'coffee cup', 'computer',
    'crown', 'diamond', 'dog', 'donut', 'door', 'elephant', 'eye', 'fish', 'flower',
    'guitar', 'hand', 'hat', 'heart', 'house', 'key', 'laptop', 'lightning', 'moon',
    'mountain', 'mouse', 'mushroom', 'octopus', 'pencil', 'pizza', 'rainbow', 'shoe',
    'smiley face', 'star', 'sun', 'tree', 'umbrella', 'watch', 'wheel'
];

// Initialize local model
function initializeLocalModel() {
    if (window.SimpleDrawingRecognizer) {
        localModel = new window.SimpleDrawingRecognizer();
        console.log('Local model initialized');
    } else {
        console.error('SimpleDrawingRecognizer not found');
    }
}

// Initialize smart model
function initializeSmartModel() {
    if (window.SmartDrawingRecognizer) {
        smartModel = new window.SmartDrawingRecognizer();
        console.log('Smart model initialized');
        // Load the smart model in background
        smartModel.loadModel().then(() => {
            console.log('Smart model loaded successfully');
        }).catch(error => {
            console.error('Error loading smart model:', error);
        });
    } else {
        console.error('SmartDrawingRecognizer not found');
    }
}

async function loadOnlineModel() {
    try {
        // Try multiple model URLs in case one fails
        const modelUrls = [
            'https://storage.googleapis.com/quickdraw_models/public/models/model.json',
            'https://cdn.jsdelivr.net/npm/@tensorflow-models/quickdraw@latest/dist/model.json',
            'https://raw.githubusercontent.com/zaidalyafeai/tensorflow_quickdraw/master/model.json'
        ];

        let modelLoaded = false;
        for (const url of modelUrls) {
            try {
                console.log(`Trying to load model from: ${url}`);
                model = await tf.loadLayersModel(url);
                console.log('Model loaded successfully from:', url);
                modelLoaded = true;
                break;
            } catch (error) {
                console.log(`Failed to load from ${url}:`, error.message);
                continue;
            }
        }

        if (!modelLoaded) {
            throw new Error('Could not load model from any source');
        }

        // Use the predefined class labels
        window.classLabels = CLASS_LABELS;

        predictionResult.textContent = 'Online model loaded! Draw something!';

        // Pre-warm the model with a dummy prediction to make first real prediction faster
        try {
            model.predict(tf.zeros([1, 28, 28, 1]));
        } catch (e) {
            console.log('Pre-warming failed, but continuing:', e.message);
        }

    } catch (error) {
        predictionResult.textContent = 'Error loading online model. Falling back to smart model.';
        console.error('Failed to load online model:', error);
        
        // Switch back to smart model
        currentModelType = 'smart';
        document.querySelector('input[value="smart"]').checked = true;
        predictionResult.textContent = 'Using smart model. Draw something!';
    }
}

function createFallbackModel() {
    // Create a simple mock model that returns random predictions
    // This is just for testing when the real model fails to load
    model = {
        predict: async (input) => {
            // Create random predictions
            const predictions = new Array(CLASS_LABELS.length).fill(0).map(() => Math.random());
            const sum = predictions.reduce((a, b) => a + b, 0);
            const normalized = predictions.map(p => p / sum);
            
            return tf.tensor2d([normalized]);
        }
    };
    window.classLabels = CLASS_LABELS;
    predictionResult.textContent = 'Fallback model loaded. Draw something!';
}

async function preprocessImage(imageData) {
    try {
        // Convert canvas image data to a TensorFlow.js tensor
        let tensor = tf.browser.fromPixels(imageData);

        // Convert to grayscale
        tensor = tf.image.rgb_to_grayscale(tensor);

        // Resize to 28x28, as Quick, Draw! models expect this size
        tensor = tf.image.resizeNearestNeighbor(tensor, [28, 28]);

        // Invert colors: Quick, Draw! models usually expect white drawing on a black background.
        // Our canvas is black drawing on white. So, we subtract from 255 (max pixel value).
        tensor = tf.sub(255, tensor);

        // Normalize to [0, 1] range
        tensor = tensor.div(255.0);

        // Add a batch dimension (e.g., [1, 28, 28, 1])
        tensor = tensor.expandDims(0);

        return tensor;
    } catch (error) {
        console.error('Error preprocessing image:', error);
        throw error;
    }
}

async function predictDrawing() {
    if (currentModelType === 'local') {
        await predictWithLocalModel();
    } else if (currentModelType === 'smart') {
        await predictWithSmartModel();
    } else if (currentModelType === 'online') {
        await predictWithOnlineModel();
    } else if (currentModelType === 'azure') {
        await predictWithAzureVision();
    } else if (currentModelType === 'google') {
        await predictWithGoogleVision();
    }
}

async function predictWithLocalModel() {
    if (!localModel) {
        predictionResult.textContent = 'Local model not initialized.';
        return;
    }

    predictionResult.textContent = 'AI is thinking...';

    try {
        // Get image data from canvas
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Check if the canvas is mostly white (empty drawing)
        let isCanvasEmpty = true;
        let pixelData = imageData.data;
        for (let i = 0; i < pixelData.length; i += 4) {
            if (pixelData[i] < 250) {
                isCanvasEmpty = false;
                break;
            }
        }

        if (isCanvasEmpty) {
            predictionResult.textContent = 'Draw something first!';
            return;
        }

        // Use local model for prediction
        const predictions = await localModel.predict(imageData);

        // Display top 5 predictions
        const top5 = predictions.slice(0, 5);
        let resultText = 'I see: ';
        top5.forEach((p, i) => {
            resultText += `${p.label} (${(p.probability * 100).toFixed(1)}%)`;
            if (i < top5.length - 1) {
                resultText += ', ';
            }
        });

        predictionResult.textContent = resultText;
        console.log("Local model predictions:", top5);

    } catch (error) {
        console.error('Error during local prediction:', error);
        predictionResult.textContent = 'Error making prediction. Try again.';
    }
}

async function predictWithSmartModel() {
    if (!smartModel) {
        predictionResult.textContent = 'Smart model not initialized.';
        return;
    }

    predictionResult.textContent = 'AI is thinking...';

    try {
        // Get image data from canvas
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Check if the canvas is mostly white (empty drawing)
        let isCanvasEmpty = true;
        let pixelData = imageData.data;
        for (let i = 0; i < pixelData.length; i += 4) {
            if (pixelData[i] < 250) {
                isCanvasEmpty = false;
                break;
            }
        }

        if (isCanvasEmpty) {
            predictionResult.textContent = 'Draw something first!';
            return;
        }

        // Use smart model for prediction
        const predictions = await smartModel.predict(imageData);

        // Display top 5 predictions
        const top5 = predictions.slice(0, 5);
        let resultText = 'I see: ';
        top5.forEach((p, i) => {
            resultText += `${p.label} (${(p.probability * 100).toFixed(1)}%)`;
            if (i < top5.length - 1) {
                resultText += ', ';
            }
        });

        predictionResult.textContent = resultText;
        console.log("Smart model predictions:", top5);

    } catch (error) {
        console.error('Error during smart prediction:', error);
        predictionResult.textContent = 'Error making prediction. Try again.';
    }
}

async function predictWithOnlineModel() {
    if (!model || !window.classLabels || window.classLabels.length === 0) {
        predictionResult.textContent = 'Online model not loaded yet.';
        return;
    }

    predictionResult.textContent = 'AI is thinking...';

    try {
        // Get image data from canvas
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Check if the canvas is mostly white (empty drawing)
        let isCanvasEmpty = true;
        let pixelData = imageData.data;
        for (let i = 0; i < pixelData.length; i += 4) {
            if (pixelData[i] < 250) {
                isCanvasEmpty = false;
                break;
            }
        }

        if (isCanvasEmpty) {
            predictionResult.textContent = 'Draw something first!';
            return;
        }

        // Preprocess the image for the model
        const processedImage = await preprocessImage(imageData);

        // Make a prediction
        const predictions = await model.predict(processedImage).data();

        // Clean up tensors to free up memory
        processedImage.dispose();

        // Find the top prediction
        const top5 = Array.from(predictions)
            .map((probability, index) => ({
                probability: probability,
                className: window.classLabels[index] || `Class ${index}`
            }))
            .sort((a, b) => b.probability - a.probability)
            .slice(0, 5);

        let resultText = 'I see: ';
        top5.forEach((p, i) => {
            resultText += `${p.className} (${(p.probability * 100).toFixed(1)}%)`;
            if (i < top5.length - 1) {
                resultText += ', ';
            }
        });

        predictionResult.textContent = resultText;
        console.log("Online model predictions:", top5);

    } catch (error) {
        console.error('Error during online prediction:', error);
        predictionResult.textContent = 'Error making prediction. Try again.';
    }
}

// Azure Computer Vision API integration
async function predictWithAzureVision() {
    // You'll need to get a free API key from: https://azure.microsoft.com/en-us/services/cognitive-services/computer-vision/
    const AZURE_API_KEY = 'YOUR_AZURE_API_KEY_HERE'; // Replace with your actual API key
    const AZURE_ENDPOINT = 'https://YOUR_REGION.api.cognitive.microsoft.com/vision/v3.2/analyze';
    
    if (!AZURE_API_KEY || AZURE_API_KEY === 'YOUR_AZURE_API_KEY_HERE') {
        predictionResult.textContent = 'Azure API key not configured. Please add your API key to use this feature.';
        return;
    }

    try {
        // Convert canvas to base64 image
        const canvas = document.getElementById('drawingCanvas');
        const imageData = canvas.toDataURL('image/png').split(',')[1]; // Remove data:image/png;base64, prefix

        const response = await fetch(`${AZURE_ENDPOINT}?visualFeatures=Tags,Description&language=en`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
                'Ocp-Apim-Subscription-Key': AZURE_API_KEY
            },
            body: Uint8Array.from(atob(imageData), c => c.charCodeAt(0))
        });

        if (!response.ok) {
            throw new Error(`Azure API error: ${response.status}`);
        }

        const result = await response.json();
        
        // Extract tags and descriptions
        const tags = result.tags || [];
        const description = result.description?.captions?.[0]?.text || '';
        
        let resultText = 'I see: ';
        if (description) {
            resultText += description + ' ';
        }
        if (tags.length > 0) {
            resultText += '(' + tags.slice(0, 3).map(tag => tag.name).join(', ') + ')';
        }

        predictionResult.textContent = resultText;
        console.log("Azure Vision predictions:", result);

    } catch (error) {
        console.error('Error during Azure prediction:', error);
        predictionResult.textContent = 'Error making prediction. Try again.';
    }
}

// Google Cloud Vision API integration
async function predictWithGoogleVision() {
    // You'll need to get an API key from: https://cloud.google.com/vision/docs/setup
    const GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY_HERE'; // Replace with your actual API key
    const GOOGLE_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';
    
    if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'YOUR_GOOGLE_API_KEY_HERE') {
        predictionResult.textContent = 'Google API key not configured. Please add your API key to use this feature.';
        return;
    }

    try {
        // Convert canvas to base64 image
        const canvas = document.getElementById('drawingCanvas');
        const imageData = canvas.toDataURL('image/png').split(',')[1]; // Remove data:image/png;base64, prefix

        const requestBody = {
            requests: [{
                image: {
                    content: imageData
                },
                features: [
                    { type: 'LABEL_DETECTION', maxResults: 5 },
                    { type: 'TEXT_DETECTION' },
                    { type: 'OBJECT_LOCALIZATION', maxResults: 3 }
                ]
            }]
        };

        const response = await fetch(`${GOOGLE_ENDPOINT}?key=${GOOGLE_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Google API error: ${response.status}`);
        }

        const result = await response.json();
        const annotations = result.responses[0];
        
        let resultText = 'I see: ';
        const labels = annotations.labelAnnotations || [];
        const objects = annotations.localizedObjectAnnotations || [];
        
        if (objects.length > 0) {
            resultText += objects[0].name + ' ';
        }
        if (labels.length > 0) {
            resultText += '(' + labels.slice(0, 3).map(label => label.description).join(', ') + ')';
        }

        predictionResult.textContent = resultText;
        console.log("Google Vision predictions:", result);

    } catch (error) {
        console.error('Error during Google prediction:', error);
        predictionResult.textContent = 'Error making prediction. Try again.';
    }
}

// Initialize models when the page loads
function initializeModels() {
    // Initialize local model immediately
    initializeLocalModel();
    
    // Initialize smart model (default)
    initializeSmartModel();
    showAnimatedEllipsis();
    
    // Try to load online model in background
    setTimeout(() => {
        if (currentModelType === 'online') {
            loadOnlineModel();
        }
    }, 1000);
}

// Load the models when the page loads
initializeModels();