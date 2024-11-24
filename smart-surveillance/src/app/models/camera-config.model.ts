export class CameraConfig {
    constructor(
        public ID: string,
        public source: string,
        public transcodingEnabled: boolean,
        public record: boolean,
        public maxReaders: number
    ) {}
}
