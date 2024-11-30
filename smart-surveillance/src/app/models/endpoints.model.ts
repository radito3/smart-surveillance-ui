import { EndpointConfig } from "./endpoint-config.model";

export class Endpoints {
    constructor(
        public itemCount: string,
        public pageCount: string,
        public items: EndpointConfig[]
    ) {}
}
