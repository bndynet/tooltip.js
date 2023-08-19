import './styles/main.scss';
import { Tooltip } from './scripts/tooltip';

const tooltips: Tooltip[] = [];

export function init() {
  applyTo('[tooltip]');
  applyTo('[tooltip-target]');
}

export function getTooltips(): Tooltip[] {
  return tooltips;
}

export function applyTo(selector: string): void{
  document.querySelectorAll<HTMLElement>(selector).forEach((sourceEl: HTMLElement) => {
    applyToElement(sourceEl);
  });
}

export function applyToElement(sourceEl: HTMLElement): Tooltip {
  const t = new Tooltip(sourceEl);
  tooltips.push(t);
  return t;
}
