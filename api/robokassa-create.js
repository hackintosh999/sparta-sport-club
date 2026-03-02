import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const { amount, description, userId, subscriptionId, type } = req.body;

        const MERCHANT_LOGIN = process.env.ROBOKASSA_MERCHANT_LOGIN;
        const PASS1 = process.env.ROBOKASSA_PASSWORD_1;

        if (!MERCHANT_LOGIN || !PASS1) {
            return res.status(500).json({ error: 'Robokassa credentials not configured' });
        }

        const invId = Math.floor(Date.now() / 1000);

        const shpUserId = userId;
        const shpType = type || 'subscription';
        const shpSubId = subscriptionId || 'none';

        const signatureSource = `${MERCHANT_LOGIN}:${amount}:${invId}:${PASS1}:Shp_SubId=${shpSubId}:Shp_Type=${shpType}:Shp_UserId=${shpUserId}`;
        const signature = crypto.createHash('sha256').update(signatureSource).digest('hex');

        const baseUrl = 'https://auth.robokassa.ru/Merchant/Index.aspx';
        const params = new URLSearchParams({
            MerchantLogin: MERCHANT_LOGIN,
            OutSum: amount.toString(),
            InvId: invId.toString(),
            Description: description,
            SignatureValue: signature,
            Shp_UserId: shpUserId,
            Shp_Type: shpType,
            Shp_SubId: shpSubId,
        });

        return res.status(200).json({
            url: `${baseUrl}?${params.toString()}`,
            invId: invId
        });

    } catch (error) {
        console.error('Robokassa creation error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
