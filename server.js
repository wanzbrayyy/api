const express = require('express');
const cors = require('cors');
const path = require('path');
const { createQRIS, checkQRISStatus, pollai } = require('./api_handler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/qris/create', async (req, res) => {
    const { amount, codeqr } = req.body;
    if (!amount || !codeqr) {
        return res.status(400).json({ 
            status: false, 
            creator: "WANZOFC TECT", 
            message: 'Amount and codeqr are required.' 
        });
    }
    try {
        const result = await createQRIS(amount, codeqr);
        if (result.status) {
            res.json(result);
        } else {
            res.status(400).json(result); 
        }
    } catch (error) {
        res.status(500).json({ 
            status: false, 
            creator: "WANZOFC TECT", 
            message: error.message || 'Internal server error.' 
        });
    }
});

app.get('/api/qris/status', async (req, res) => {
    const { merchantId, apiKey } = req.query;
    if (!merchantId || !apiKey) {
        return res.status(400).json({ 
            status: false, 
            creator: "WANZOFC TECT", 
            message: 'merchantId and apiKey are required.' 
        });
    }
    try {
        const result = await checkQRISStatus(merchantId, apiKey);
        if (result.status) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({ 
            status: false, 
            creator: "WANZOFC TECT", 
            message: error.message || 'Internal server error.' 
        });
    }
});

app.post('/api/ai/pollinations', async (req, res) => {
    const { question, systemMessage, model, imageBase64 } = req.body;

    if (!question) {
        return res.status(400).json({
            status: false,
            creator: "WANZOFC TECT",
            message: "Question is required."
        });
    }

    try {
        const imageBuffer = imageBase64 ? Buffer.from(imageBase64, 'base64') : null;
        const result = await pollai(question, { systemMessage, model, imageBuffer });
        
        if (result.status) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }

    } catch (error) {
        res.status(500).json({
            status: false,
            creator: "WANZOFC TECT",
            message: error.message || "Internal server error with Pollinations AI."
        });
    }
});


app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`WANZOFC TECT API server running on http://localhost:${PORT}`);
});