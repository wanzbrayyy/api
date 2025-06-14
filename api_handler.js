// api_handler.js
const axios = require('axios');
const FormData = require('form-data');
const QRCode = require('qrcode');
const { Readable } = require('stream');


function convertCRC16(str) {
    let crc = 0xFFFF;
    const strlen = str.length;
    for (let c = 0; c < strlen; c++) {
        crc ^= str.charCodeAt(c) << 8;
        for (let i = 0; i < 8; i++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc = crc << 1;
            }
        }
    }
    let hex = crc & 0xFFFF;
    hex = ("000" + hex.toString(16).toUpperCase()).slice(-4);
    return hex;
}

function generateTransactionId() {
    const randomString = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `WZFC-${randomString}`;
}

function generateExpirationTime() {
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 30);
    return expirationTime.toISOString();
}

async function bufferToStream(buffer) {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
}

async function uploadToCatbox(buffer) {
    try {
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        const stream = await bufferToStream(buffer);
        form.append('fileToUpload', stream, {
            filename: 'qris_wanzoft_tect.png',
            contentType: 'image/png'
        });
        const response = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: { ...form.getHeaders() },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        if (!response.data || typeof response.data !== 'string' || !response.data.startsWith('http')) {
            throw new Error('Failed to upload image to Catbox or received invalid URL.');
        }
        return response.data;
    } catch (error) {
        throw error;
    }
}

async function createQRIS(amount, codeqr) {
    try {
        if (!codeqr) throw new Error('QRIS code (codeqr) is required');
        if (!amount || isNaN(parseInt(amount)) || parseInt(amount) <= 0) throw new Error('Valid amount is required');
        
        let qrisData = String(codeqr);
        if (qrisData.length < 4) throw new Error('Invalid QRIS code format');
        qrisData = qrisData.slice(0, -4);
        const step1 = qrisData.replace("010211", "010212");
        const step2 = step1.split("5802ID");
        if (step2.length < 2) throw new Error('Invalid QRIS code structure after splitting');

        const numericAmount = parseInt(amount).toString();
        let uang = "54" + ("0" + numericAmount.length).slice(-2) + numericAmount;
        uang += "5802ID";
        
        const qrisStringToEncode = step2[0] + uang + step2[1];
        const crc = convertCRC16(qrisStringToEncode);
        const finalQrisString = qrisStringToEncode + crc;
        
        const buffer = await QRCode.toBuffer(finalQrisString, {
            errorCorrectionLevel: 'H', type: 'png', margin: 1, width: 300
        });
        const imageUrl = await uploadToCatbox(buffer);

        return {
            status: true,
            creator: "WANZOFC TECT",
            result: {
                transactionId: generateTransactionId(),
                amount: parseInt(amount),
                currency: "IDR",
                expirationTime: generateExpirationTime(),
                qrImageUrl: imageUrl,
                qrString: finalQrisString,
            },
            message: "QRIS successfully generated."
        };
    } catch (error) {
        return {
            status: false,
            creator: "WANZOFC TECT",
            message: error.message || "An unknown error occurred while generating QRIS."
        };
    }
}

async function checkQRISStatus(merchantId, apiKey) {
    try {
        if (!merchantId || !apiKey) throw new Error('Merchant ID and API Key are required');
        const apiUrl = `https://gateway.okeconnect.com/api/mutasi/qris/${merchantId}/${apiKey}`;
        const response = await axios.get(apiUrl);
        
        if (response.data && response.data.status === true && response.data.data) {
            const mutations = response.data.data;
            let formattedMutationsText = '📊 QRIS MUTATIONS - WANZOFC TECT 📊\n\n';
            if (!mutations || mutations.length === 0) {
                formattedMutationsText += '🚫 No mutation data found for the last 7 days.';
            } else {
                mutations.forEach(entry => {
                    formattedMutationsText += `🗓️ Date: ${entry.date}\n`;
                    formattedMutationsText += `🏦 Issuer: ${entry.brand_name}\n`;
                    formattedMutationsText += `💰 Amount: Rp ${parseInt(entry.amount).toLocaleString('id-ID')}\n`;
                    formattedMutationsText += `🧾 Reference: ${entry.reference_number || '-'}\n`;
                    formattedMutationsText += `💬 Note: ${entry.note || '-'}\n\n`;
                });
            }
            return {
                status: true,
                creator: "WANZOFC TECT",
                result: {
                    mutations: response.data.data,
                    formattedMessage: formattedMutationsText
                },
                message: "QRIS status successfully retrieved."
            };
        } else {
             return {
                status: false,
                creator: "WANZOFC TECT",
                message: response.data.msg || "Failed to retrieve QRIS status or no data."
            };
        }
    } catch (error) {
        let errorMessage = "An unknown error occurred while checking QRIS status.";
        if (error.response && error.response.data && error.response.data.msg) {
            errorMessage = error.response.data.msg;
        } else if (error.message) {
            errorMessage = error.message;
        }
        return {
            status: false,
            creator: "WANZOFC TECT",
            message: errorMessage
        };
    }
}

async function pollai(question, { systemMessage = null, model = 'gpt-4.1-mini', imageBuffer = null } = {}) {
    try {
        const modelList = {
            'gpt-4.1': 'openai-large',
            'gpt-4.1-mini': 'openai',
            'gpt-4.1-nano': 'openai-fast'
        };
        
        if (!question) throw new Error('Question is required');
        if (!modelList[model]) throw new Error(`List available model: ${Object.keys(modelList).join(', ')}`);
        
        const messages = [
            ...(systemMessage ? [{ role: 'system', content: systemMessage }] : []),
            {
                role: 'user',
                content: [
                    { type: 'text', text: question },
                    ...(imageBuffer ? [{
                        type: 'image_url',
                        image_url: { url: `data:image/jpeg;base64,${imageBuffer.toString('base64')}` }
                    }] : [])
                ]
            }
        ];
        
        const { data } = await axios.post('https://text.pollinations.ai/openai', {
            messages,
            model: modelList[model],
            temperature: 0.5,
            presence_penalty: 0,
            top_p: 1,
            frequency_penalty: 0
        }, {
            headers: {
                accept: '*/*',
                authorization: 'Bearer dummy',
                'content-type': 'application/json',
                origin: 'https://sur.pollinations.ai',
                referer: 'https://sur.pollinations.ai/',
                'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
            }
        });
        
        return {
            status: true,
            creator: "WANZOFC TECT",
            result: {
                response: data.choices[0].message.content
            },
            message: "AI response successfully generated."
        };

    } catch (error) {
        console.error("Error in pollai function:", error.message);
        let errorMessage = 'No result found or an error occurred with Pollinations AI.';
        if (error.response && error.response.data && error.response.data.error && error.response.data.error.message) {
            errorMessage = error.response.data.error.message;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        return {
            status: false,
            creator: "WANZOFC TECT",
            message: errorMessage
        };
    }
}

module.exports = { 
    createQRIS, 
    checkQRISStatus,
    pollai
};