import { AxisInfo } from "./mongofont.service";


export type FontUrls = {
  ascii: string
  full: string
}
export type FontByWeight = {
  weight: number;
  urls: FontUrls;
  italicUrls?: FontUrls;
};

export type FontNameUrlMulti = {
  idx: number
  axes?: AxisInfo[];
  weights: number[];
  weightInfo: { min_value: number, max_value: number, all?: number[], virtualWeights: number[] };
  italics: string[];
  hasItalics: boolean;
  name: string;
  url: string;
  fonts: FontByWeight[]
  classification: Record<string, Record<string, string>>;
};

export function generateFontCss(font: { name: string, url: string }) {
  return `@font-face {
    font-family: "${font.name}";
    src: url("${font.url}");
  }`;
}
export function generateFontCssWeight(font: { name: string, url: string, weight: string | number, style: string }) {
  return `@font-face {
    font-family: "${font.name}";
    src: url("${font.url}");
    font-weight: ${font.weight};
    font-style: ${font.style};
    font-display: swap;
  }
  `;
}
export function appendStyleTag(css: string) {
  const head = document.getElementsByTagName('head')[0];
  const style = document.createElement('style');
  style.type = 'text/css';
  style.appendChild(document.createTextNode(css));
  head.appendChild(style);
}
