export enum AnalysisMode {
    Presence,
    Behaviour,
    Activity
}

export enum WebhookAuthType {
    Basic,
    BearerToken
}

export class Config {
    constructor(
        public analysisMode: AnalysisMode = AnalysisMode.Behaviour,

        public uiPopup: boolean = true,

        public webhookUrl?: string,
        public webhookRequestTimeout: number = 10,
        public webhookAuthType?: WebhookAuthType,
        public webhookCredentials?: string,  // encrypted

        public smtpServer?: string,
        public smptSender?: string,
        public smtpRecipient?: string,
        public smtpCredentials?: string,  // encrypted
    ) {}
}
