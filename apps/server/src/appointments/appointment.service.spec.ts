import { validateAppointmentSchedule } from './appointment.service.js';

describe('appointment schedule rules', () => {
  it('allows confirmation exactly 15 minutes after the selected start', () => {
    expect(() =>
      validateAppointmentSchedule(
        new Date('2026-11-05T03:00:00.000Z'),
        new Date('2026-11-05T04:00:00.000Z'),
        new Date('2026-11-05T03:15:00.000Z'),
      ),
    ).not.toThrow();
  });

  it('rejects confirmation after the inclusive 15-minute allowance', () => {
    expect(() =>
      validateAppointmentSchedule(
        new Date('2026-11-05T03:00:00.000Z'),
        new Date('2026-11-05T04:00:00.000Z'),
        new Date('2026-11-05T03:15:00.001Z'),
      ),
    ).toThrowError(
      expect.objectContaining({
        status: 409,
        response: expect.objectContaining({ code: 'CONFIRMATION_TOO_LATE' }),
      }),
    );
  });

  it('rejects off-grid starts and intervals extending after closing', () => {
    expect(() =>
      validateAppointmentSchedule(
        new Date('2026-11-05T03:15:00.000Z'),
        new Date('2026-11-05T04:15:00.000Z'),
        new Date('2026-11-04T00:00:00.000Z'),
      ),
    ).toThrowError(expect.objectContaining({ status: 400 }));

    expect(() =>
      validateAppointmentSchedule(
        new Date('2026-11-05T09:30:00.000Z'),
        new Date('2026-11-05T10:30:00.000Z'),
        new Date('2026-11-04T00:00:00.000Z'),
      ),
    ).toThrowError(expect.objectContaining({ status: 400 }));
  });
});
