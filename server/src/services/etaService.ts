import type { LeadTimeRange, BusinessCalendar as SettingsBusinessCalendar } from '../models/Settings';

export type BusinessCalendar = SettingsBusinessCalendar;

export type LeadTimeSnapshot = {
  production: LeadTimeRange;
  shipping: LeadTimeRange;
  businessCalendar: BusinessCalendar;
};

export type StageKey = 'in_production' | 'shipping';

export type ExpectedSchedule = {
  in_production?: { expectedStartAt?: Date; expectedEndAt?: Date };
  shipping?: { expectedStartAt?: Date; expectedEndAt?: Date };
};

export type EtaResponse = {
  stages: Record<StageKey, {
    status: 'pending' | 'in_progress' | 'done';
    expectedStartAt?: string;
    expectedEndAt?: string;
    remainingBusinessDays?: number;
  }>;
  overall: {
    deliveryWindow: { start: string; end: string };
    isLate: boolean;
    daysLate: number;
  };
};

const DAY_MS = 24 * 60 * 60 * 1000;
const nameToIdx: Record<string, number> = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };

function workingSet(workingDays: string[]) {
  const s = new Set<number>();
  for (const k of workingDays) s.add(nameToIdx[k] ?? -1);
  return s;
}

export function addBusinessDays(start: Date, days: number, workingDays: string[]): Date {
  const ws = workingSet(workingDays);
  let d = new Date(start);
  let remaining = Math.max(0, Math.floor(days));
  while (remaining > 0) {
    d = new Date(d.getTime() + DAY_MS);
    if (ws.has(d.getDay())) remaining--;
  }
  return d;
}

function countWorkingDaysBetween(start: Date, end: Date, workingDays: string[]): number {
  if (end <= start) return 0;
  const ws = workingSet(workingDays);
  let d = new Date(start);
  let count = 0;
  while (d < end) {
    if (ws.has(d.getDay())) count++;
    d = new Date(d.getTime() + DAY_MS);
  }
  return count;
}

export function computeExpectedScheduleFromSnapshot(snapshot: LeadTimeSnapshot, createdAt: Date, paidAt?: Date): { schedule: ExpectedSchedule, deliveryWindow: { start: Date; end: Date } } {
  const cal = snapshot.businessCalendar;
  const startProd = paidAt || createdAt;
  // For schedule bars, use max duration as the target end for each stage
  const prodEnd = addBusinessDays(startProd, snapshot.production.maxDays, cal.workingDays);
  const shipStart = prodEnd;
  const shipEnd = addBusinessDays(shipStart, snapshot.shipping.maxDays, cal.workingDays);

  const minDelivery = addBusinessDays(startProd, snapshot.production.minDays + snapshot.shipping.minDays, cal.workingDays);
  const maxDelivery = addBusinessDays(startProd, snapshot.production.maxDays + snapshot.shipping.maxDays, cal.workingDays);

  const schedule: ExpectedSchedule = {
    in_production: { expectedStartAt: startProd, expectedEndAt: prodEnd },
    shipping: { expectedStartAt: shipStart, expectedEndAt: shipEnd },
  };
  return { schedule, deliveryWindow: { start: minDelivery, end: maxDelivery } };
}

export function computeEtaForOrder(params: {
  status: 'submitted' | 'paid' | 'in_production' | 'shipping' | 'delivered';
  createdAt: Date;
  paidAt?: Date;
  snapshot: LeadTimeSnapshot;
  existingSchedule?: ExpectedSchedule;
  now?: Date;
}): EtaResponse {
  const { status, createdAt, paidAt, snapshot, existingSchedule } = params;
  const now = params.now || new Date();

  const { schedule, deliveryWindow } = computeExpectedScheduleFromSnapshot(snapshot, createdAt, paidAt);
  const effSchedule = existingSchedule || schedule;

  const stages: EtaResponse['stages'] = {
    in_production: { status: 'pending' },
    shipping: { status: 'pending' },
  } as any;

  // Determine stage statuses
  const prod = effSchedule.in_production;
  const ship = effSchedule.shipping;

  if (status === 'in_production' || status === 'shipping' || status === 'delivered') {
    stages.in_production.status = 'done';
  } else if (status === 'paid') {
    stages.in_production.status = 'in_progress';
  } else {
    stages.in_production.status = 'pending';
  }

  if (status === 'delivered') {
    stages.shipping.status = 'done';
  } else if (status === 'shipping') {
    stages.shipping.status = 'in_progress';
  } else {
    stages.shipping.status = 'pending';
  }

  if (prod) {
    stages.in_production.expectedStartAt = prod.expectedStartAt?.toISOString();
    stages.in_production.expectedEndAt = prod.expectedEndAt?.toISOString();
    const end = prod.expectedEndAt ? new Date(prod.expectedEndAt) : undefined;
    if (end) {
      stages.in_production.remainingBusinessDays = countWorkingDaysBetween(now, end, snapshot.businessCalendar.workingDays);
    }
  }
  if (ship) {
    stages.shipping.expectedStartAt = ship.expectedStartAt?.toISOString();
    stages.shipping.expectedEndAt = ship.expectedEndAt?.toISOString();
    const end = ship.expectedEndAt ? new Date(ship.expectedEndAt) : undefined;
    if (end) {
      stages.shipping.remainingBusinessDays = countWorkingDaysBetween(now, end, snapshot.businessCalendar.workingDays);
    }
  }

  // Late if current stage end has passed
  let isLate = false;
  let daysLate = 0;
  if (status === 'paid' && prod?.expectedEndAt && now > prod.expectedEndAt) {
    isLate = true;
    daysLate = countWorkingDaysBetween(prod.expectedEndAt, now, snapshot.businessCalendar.workingDays);
  }
  if (status === 'shipping' && ship?.expectedEndAt && now > ship.expectedEndAt) {
    isLate = true;
    daysLate = countWorkingDaysBetween(ship.expectedEndAt, now, snapshot.businessCalendar.workingDays);
  }

  return {
    stages,
    overall: {
      deliveryWindow: { start: deliveryWindow.start.toISOString(), end: deliveryWindow.end.toISOString() },
      isLate,
      daysLate,
    }
  };
}
