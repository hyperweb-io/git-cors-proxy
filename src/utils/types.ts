import { FastifyRequest } from "fastify";

export interface ProxyOptions {
  origin?: string;
  insecureOrigins?: string[];
}

export interface ParsedUrl {
  pathname: string;
  query: {
    service?: string;
    [key: string]: string | undefined;
  };
}

export type RequestWithParsedUrl = FastifyRequest & {
  parsedUrl?: ParsedUrl;
};
