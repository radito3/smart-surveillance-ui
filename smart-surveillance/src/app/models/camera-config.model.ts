export class CameraConfig {
    constructor(
        public ID: string,
        public source: string,
        public enableTranscoding: boolean = false,
        public record: boolean = false,
        public maxReaders?: number
    ) {}
}
