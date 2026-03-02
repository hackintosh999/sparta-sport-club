import crypto from 'crypto';

export default async function handler(req, res) {
    // Vercel handles dynamic params if rewritten properly, OR we parse req.url
    const invId = req.query.invId || req.url.split('/').pop().split('?')[0];

    if (!invId) {
        return res.status(400).json({ error: 'Missing Invoice ID' });
    }

    try {
        const MERCHANT_LOGIN = process.env.ROBOKASSA_MERCHANT_LOGIN;
        const PASS2 = process.env.ROBOKASSA_PASSWORD_2;

        if (!MERCHANT_LOGIN || !PASS2) {
            return res.status(500).json({ error: 'Robokassa credentials not configured' });
        }

        const signatureSource = `${MERCHANT_LOGIN}:${invId}:${PASS2}`;
        const signature = crypto.createHash('sha256').update(signatureSource).digest('hex');

        const url = `https://auth.robokassa.ru/Merchant/WebService/Service.asmx/OpState?MerchantLogin=${MERCHANT_LOGIN}&InvId=${invId}&Signature=${signature}`;

        const response = await fetch(url);
        const xmlText = await response.text();

        const stateCodeMatch = xmlText.match(/<State><Code>(\d+)<\/Code><\/State>/);
        const stateCode = stateCodeMatch ? stateCodeMatch[1] : 'unknown';

        const resultCodeMatch = xmlText.match(/<Result><Code>(\d+)<\/Code><\/Result>/);
        const resultCode = resultCodeMatch ? resultCodeMatch[1] : '1';

        let status = 'pending';
        if (stateCode === '100') {
            status = 'succeeded';
        } else if (stateCode === '50' || stateCode === '80') {
            status = 'pending';
        } else if (stateCode === '10' || stateCode === '60') {
            status = 'canceled';
        }

        return res.status(200).json({
            status,
            stateCode,
            resultCode,
            raw: xmlText
        });

    } catch (error) {
        console.error('Robokassa check error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
