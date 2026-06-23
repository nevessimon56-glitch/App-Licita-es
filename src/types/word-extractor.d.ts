declare module "word-extractor" {
  interface ExtractedWordDocument {
    getBody(): string;
    getFootnotes(): string;
    getEndnotes(): string;
    getHeaders(): string;
    getFooters(): string;
  }

  export default class WordExtractor {
    extract(input: Buffer | string): Promise<ExtractedWordDocument>;
  }
}
