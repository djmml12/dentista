import type { Request, Response } from 'express';
import * as svc from './whatsapp.service.js';
import type { UpsertWhatsappConfigInput, TestWhatsappInput } from './whatsapp.schema.js';

export async function getConfig(req: Request, res: Response) {
  const cfg = await svc.getConfig();
  if (!cfg) {
    res.json(null);
    return;
  }
  const { accessToken: _token, ...safe } = cfg;
  res.json({ ...safe, hasToken: _token.length > 0 });
}

export async function saveConfig(req: Request, res: Response) {
  const input = req.body as UpsertWhatsappConfigInput;
  const cfg = await svc.upsertConfig(input);
  const { accessToken: _token, ...safe } = cfg;
  res.json({ ...safe, hasToken: _token.length > 0 });
}

export async function testWhatsapp(req: Request, res: Response) {
  const { to } = req.body as TestWhatsappInput;
  await svc.sendTestWhatsapp(to);
  res.json({ ok: true });
}
