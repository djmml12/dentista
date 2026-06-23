import type { Request, Response } from 'express';
import * as svc from './email.service.js';
import type { UpsertEmailConfigInput, TestEmailInput } from './email.schema.js';

export async function getConfig(req: Request, res: Response) {
  const cfg = await svc.getConfig();
  if (!cfg) {
    res.json(null);
    return;
  }
  // Never expose the password in the response.
  const { pass: _pass, ...safe } = cfg;
  res.json({ ...safe, hasPass: _pass.length > 0 });
}

export async function saveConfig(req: Request, res: Response) {
  const input = req.body as UpsertEmailConfigInput;
  const cfg = await svc.upsertConfig(input);
  const { pass: _pass, ...safe } = cfg;
  res.json({ ...safe, hasPass: _pass.length > 0 });
}

export async function testEmail(req: Request, res: Response) {
  const { to } = req.body as TestEmailInput;
  await svc.sendTestEmail(to);
  res.json({ ok: true });
}
