import crypto from 'crypto';

export default async function handler(req, res) {
    const params = req.method === 'POST' ? req.body : req.query;

    const { OutSum, InvId, SignatureValue } = params;

    if (!OutSum || !InvId || !SignatureValue) {
        return res.status(400).send('Missing required parameters');
    }

    try {
        const PASS2 = process.env.ROBOKASSA_PASSWORD_2;

        if (!PASS2) {
            console.error('Robokassa Password 2 not configured');
            return res.status(500).send('Config Error');
        }

        const customParams = Object.keys(params)
            .filter(key => key.startsWith('Shp_'))
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join(':');

        const signatureSource = customParams ?
            `${OutSum}:${InvId}:${PASS2}:${customParams}` :
            `${OutSum}:${InvId}:${PASS2}`;

        const mySignature = crypto.createHash('sha256').update(signatureSource.toUpperCase()).digest('hex');

        if (mySignature.toUpperCase() !== SignatureValue.toUpperCase()) {
            console.error('Robokassa signature mismatch', { expected: mySignature, received: SignatureValue });
            return res.status(400).send('bad signature');
        }

        console.log(`Payment successful for InvId: ${InvId}, Amount: ${OutSum}`);

        return res.status(200).send(`OK${InvId}`);

    } catch (error) {
        console.error('Robokassa result error:', error);
        return res.status(500).send('error');
    }
}
