export class SourceConfig {
    constructor(
        public type: string
    ) {}
}

export class EndpointConfig {
    constructor(
        public name: string,
        public source: SourceConfig
    ) {}
}
