export interface NotificationPayload {
  to: string;
  subject?: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface INotificationProvider {
  send(payload: NotificationPayload): Promise<boolean>;
  isConfigured(): boolean;
}
