export class CameraConfig {
    constructor(
        public ID: string,
        public source: string,
        public record: boolean = false,
        public maxReaders?: number
    ) {}
}
