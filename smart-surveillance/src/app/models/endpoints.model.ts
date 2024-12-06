import { EndpointConfig } from "./endpoint-config.model";

export class Endpoints {
    constructor(
        public itemCount: number,
        public pageCount: number,
        public items: EndpointConfig[]
    ) {}
}
