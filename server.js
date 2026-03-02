import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

// These should be in your .env file
const SHOP_ID = process.env.VITE_YOOKASSA_SHOP_ID || 'test_shop_id';
const SECRET_KEY = process.env.VITE_YOOKASSA_SECRET_KEY || 'test_secret_key';

const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3/payments';

app.post('/api/create-payment', async (req, res) => {
    try {
        const { amount, description, userId, subscriptionId, type } = req.body;

        const idempotenceKey = uuidv4();

        // Use basic auth standard formulation
        const authString = Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString('base64');

        const requestBody = {
            amount: {
                value: amount.toString(),
                currency: 'RUB'
            },
            capture: true, // Auto-capture the payment
            confirmation: {
                type: 'redirect',
                // Local dev URL or production URL based on env
                return_url: `${req.headers.origin}/profile?payment=success&type=${type || 'subscription'}`
            },
            description: description,
            metadata: {
                userId,
                subscriptionId,
                type
            }
        };

        const yooResponse = await fetch(YOOKASSA_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authString}`,
                'Idempotence-Key': idempotenceKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!yooResponse.ok) {
            const errorText = await yooResponse.text();
            console.error('YooKassa error:', yooResponse.status, errorText);
            return res.status(yooResponse.status).json({ error: 'Failed to create payment in YooKassa', details: errorText });
        }

        const data = await yooResponse.json();

        // Return the confirmation URL to the frontend so it can redirect the user
        res.json({
            id: data.id,
            status: data.status,
            confirmationUrl: data.confirmation.confirmation_url
        });

    } catch (error) {
        console.error('Payment creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Endpoint to check payment status after returning
app.get('/api/check-payment/:paymentId', async (req, res) => {
    try {
        const { paymentId } = req.params;

        const authString = Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString('base64');
        const yooResponse = await fetch(`${YOOKASSA_API_URL}/${paymentId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${authString}`,
            }
        });

        if (!yooResponse.ok) {
            return res.status(yooResponse.status).json({ error: 'Failed to fetch payment status' });
        }

        const data = await yooResponse.json();
        res.json({
            status: data.status,
            metadata: data.metadata,
            amount: data.amount
        });
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Payment Server running on port ${PORT}`);
});
