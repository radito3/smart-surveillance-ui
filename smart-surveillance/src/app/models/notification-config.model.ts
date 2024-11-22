export class NotificationConfig {
    constructor(
        public uiPopup: boolean,
        public webhookUrl: string,
        public smtpUrl: string
    ) {}
}
