export enum AnalysisMode {
    Presence,
    Behaviour,
    Activity
}

export class Config {
    constructor(
        public analysisMode: AnalysisMode,
        public uiPopup: boolean,
        public webhookUrl: string,
        public smtpUrl: string,
        // ...
    ) {}
}
