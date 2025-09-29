declare module 'html-to-image' {
  export function toBlob(
    node: HTMLElement,
    options?: {
      width?: number;
      height?: number;
      style?: Partial<CSSStyleDeclaration>;
      pixelRatio?: number;
      cacheBust?: boolean;
      backgroundColor?: string;
      filter?: (domNode: HTMLElement) => boolean;
      quality?: number;
      includeQueryParams?: boolean;
    }
  ): Promise<Blob>;

  export function toPng(
    node: HTMLElement,
    options?: Parameters<typeof toBlob>[1]
  ): Promise<string>;

  export function toJpeg(
    node: HTMLElement,
    options?: Parameters<typeof toBlob>[1]
  ): Promise<string>;
}
