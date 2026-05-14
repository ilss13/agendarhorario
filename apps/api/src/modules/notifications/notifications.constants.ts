export const NOTIFICATIONS_QUEUE = 'notifications';

export type NotificationJobKind =
  | 'CREATED'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'REMINDER_24H'
  | 'REMINDER_1H';

export interface NotificationJobData {
  appointmentId: string;
  kind: NotificationJobKind;
}

export const jobNameFor = (kind: NotificationJobKind): string => `notify.${kind}`;
