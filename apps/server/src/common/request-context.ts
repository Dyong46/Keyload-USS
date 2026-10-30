import type { Request } from 'express';
import type { DemoStaff } from './demo-staff.js';

export type RequestContext = Request & {
  requestId: string;
  staff: DemoStaff;
};
