import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

router.get('/:symbol', async (req: Request, res: Response) => {
  const symbol = req.params.symbol.toUpperCase();
  const token = process.env.FINNHUB_API_KEY;

  if (!token) {
    res.status(500).json({ error: 'FINNHUB_API_KEY not configured' });
    return;
  }

  try {
    const { data } = await axios.get('https://finnhub.io/api/v1/quote', {
      params: { symbol, token },
      timeout: 5000,
    });
    res.json(data);
  } catch (err) {
    if (axios.isAxiosError(err)) {
      res.status(err.response?.status ?? 500).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch quote' });
    }
  }
});

export default router;
