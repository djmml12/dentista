import type { Request, Response } from 'express';
import { getFinancialSummary } from './finances.service.js';

export async function summaryCtrl(req: Request, res: Response) {
  const now = new Date();
  const year = parseInt((req.query.year as string) || String(now.getFullYear()), 10);
  const month = parseInt((req.query.month as string) || String(now.getMonth() + 1), 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    res.status(400).json({ error: 'Parámetros year y month inválidos' });
    return;
  }

  const summary = await getFinancialSummary(year, month);
  res.json(summary);
}
