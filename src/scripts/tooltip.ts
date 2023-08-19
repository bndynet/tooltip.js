import { merge } from 'ts-deepmerge';
import { arrow, autoUpdate, computePosition, offset, flip, shift, Placement } from '@floating-ui/dom';

export type Position = 'left' | 'top' | 'right' | 'bottom';
export type Trigger = 'click' | 'mouseover';

export interface TooltipOptions {
  style?: {
    color?: string;
    backgroundColor?: string;
    borderRadius?: string;
    borderWidth?: string;
    borderColor?: string;
    maxWidth?: string;
    padding?: string;
    zIndex?: number;
  };

  arrow?: string;
  ['class']?: string;
  target?: string;
  placement?: Position;
  trigger?: Trigger;
  focusable?: boolean;
}

export class Tooltip {
  static defaults: TooltipOptions = {
    style: {
      color: `var(--tt-color)`,
      backgroundColor: `var(--tt-background-color)`,
      borderRadius: `4px`,
      maxWidth: '260px',
      padding: '0.5rem',
      zIndex: 50,
    },
    arrow: '0.75rem',
    placement: 'top',
    trigger: 'mouseover',
  };

  private tooltipEl?: HTMLElement;
  private needArrow = false;
  private options: TooltipOptions;

  constructor(
    private sourceEl: HTMLElement,
    options?: TooltipOptions,
  ) {
    const optionsFromEl: any = {};
    this.sourceEl
      .getAttributeNames()
      .filter((name) => name.startsWith('tooltip-'))
      .forEach((name) => {
        const pname = this.snakeToCamelName(name.replace('tooltip-', ''));
        if (pname === 'style') {
          optionsFromEl[pname] = this.styleTextToObject(this.sourceEl.getAttribute(name) || '');
        } else {
          optionsFromEl[pname] = this.sourceEl.getAttribute(name) === '' ? true : this.sourceEl.getAttribute(name);
        }
      });
    this.options = merge(Tooltip.defaults, optionsFromEl, options || {});
    this.needArrow = !!(this.options.arrow && this.options.arrow !== '0' && this.options.arrow !== 'none');

    if (this.options.target) {
      this.tooltipEl = document.querySelector(this.options.target) as HTMLElement;
    } else if (this.sourceEl.getAttribute('tooltip')) {
      this.tooltipEl = document.createElement('div');
      this.tooltipEl.innerHTML = this.sourceEl.getAttribute('tooltip') as string;
      document.body.appendChild(this.tooltipEl);
    }

    this.checkArrowEl(this.needArrow);
    this.init();
  }

  init(): void {
    if (this.tooltipEl) {
      this.appendStylesForTooltip();
    }

    let tooltipShown = false;
    let eyesInSource = false;
    let eyesInTooltip = false;
    let task: (() => void) | undefined;

    const show = () => {
      if (tooltipShown) {
        return;
      }
      if (task) {
        // Important, https://floating-ui.com/docs/autoUpdate#usage
        task();
      }
      task = this.showTooltip();
      tooltipShown = true;
    };
    const hide = () => {
      if (!tooltipShown) {
        return;
      }
      if (task) {
        // Important, https://floating-ui.com/docs/autoUpdate#usage
        task();
        task = undefined;
      }
      this.hideTooltip();
      tooltipShown = false;
    };

    let events = ['mouseover', 'mouseleave'];
    if (this.options?.trigger) {
      if (!this.options?.trigger.startsWith('mouseover')) {
        events = (this.options?.trigger || '').split(',').map((item) => item.trim());
      }
    }

    // focus/blur on source element
    this.sourceEl.addEventListener('focus', show);
    this.sourceEl.addEventListener('blur', hide);

    if (events.length === 1) {
      this.sourceEl.addEventListener(events[0], () => {
        if (task) {
          hide();
        } else {
          show();
        }
      });
    } else {
      const msToDelay = this.options?.focusable ? 300 : 0;
      const delayToHide = () => {
        setTimeout(() => {
          if (!eyesInTooltip && !eyesInSource) {
            hide();
          }
        }, msToDelay);
      };
      this.sourceEl.addEventListener(events[0], () => {
        show();
        eyesInSource = true;
      });

      this.sourceEl.addEventListener(events[1], () => {
        delayToHide();
        eyesInSource = false;
      });
      if (this.tooltipEl) {
        this.tooltipEl.addEventListener('mouseover', () => {
          eyesInTooltip = true;
          show();
        });
        this.tooltipEl.addEventListener('mouseleave', () => {
          delayToHide();
          eyesInTooltip = false;
        });
      }
    }
  }

  hideTooltip() {
    if (this.tooltipEl) {
      this.tooltipEl.style.display = 'none';
    }
  }

  showTooltip(): (() => void) | undefined {
    if (this.tooltipEl) {
      this.tooltipEl.style.display = 'block';
      const placement = (this.sourceEl.getAttribute('tooltip-placement') || 'top') as Placement;

      let arrowLen = 0;
      let floatingOffset = 0;

      const arrowEl = this.tooltipEl.querySelector('.arrow') as HTMLElement;
      if (arrowEl) {
        arrowLen = arrowEl.offsetWidth;
        // Get half the arrow box's hypotenuse length
        floatingOffset = Math.sqrt(2 * arrowLen ** 2) / 2;
      }

      return autoUpdate(this.sourceEl, this.tooltipEl, () => {
        computePosition(this.sourceEl, this.tooltipEl!, {
          placement,
          middleware: [offset(floatingOffset), arrow({ element: arrowEl }), flip(), shift()],
        }).then(({ x, y, middlewareData, placement }) => {
          ['top', 'right', 'bottom', 'left'].forEach((p) => {
            this.tooltipEl!.classList.remove(p);
          });
          this.tooltipEl!.classList.add(placement);

          Object.assign(this.tooltipEl!.style, {
            display: 'block',
            left: `${x}px`,
            top: `${y}px`,
          });

          const side = placement.split('-')[0];

          const staticSide = {
            top: 'bottom',
            right: 'left',
            bottom: 'top',
            left: 'right',
          }[side] as string;

          if (arrowEl && middlewareData.arrow) {
            const borderWidth = this.tooltipEl?.style.borderWidth;
            const arrowStyles: { [key: string]: object } = {
              left: {
                'border-top-width': borderWidth,
                'border-right-width': borderWidth,
                'border-bottom-width': '0',
                'border-left-width': '0',
              },
              right: {
                'border-top-width': '0',
                'border-right-width': '0',
                'border-bottom-width': borderWidth,
                'border-left-width': borderWidth,
              },
              top: {
                'border-top-width': '0',
                'border-right-width': borderWidth,
                'border-bottom-width': borderWidth,
                'border-left-width': '0',
              },
              bottom: {
                'border-top-width': borderWidth,
                'border-right-width': '0',
                'border-bottom-width': '0',
                'border-left-width': borderWidth,
              },
            };
            const { x, y } = middlewareData.arrow;
            Object.assign(
              arrowEl.style,
              {
                left: x != null ? `${x}px` : '',
                top: y != null ? `${y}px` : '',
                // Ensure the static side gets unset when
                // flipping to other placements' axes.
                right: '',
                bottom: '',
                [staticSide]: `${-arrowLen / 2}px`,
              },
              arrowStyles[placement],
            );
          }
        });
      });
    }
  }

  private hasAttribute(el: HTMLElement, prop: string): boolean {
    return el.getAttribute(prop) !== null;
  }

  private camelToSnakeName(name: string): string {
    return name.replace(/([a-zA-Z])(?=[A-Z])/g, '$1-').toLowerCase();
  }

  private snakeToCamelName(name: string): string {
    name.match(/-\w/g)?.forEach((m) => {
      name = name.replace(m, m.toUpperCase().replace('-', ''));
    });
    return name;
  }

  private checkArrowEl(required: boolean): HTMLElement | null {
    if (this.tooltipEl) {
      let arrowEl = this.tooltipEl.querySelector('.arrow') as HTMLElement | null;
      if (required) {
        if (!arrowEl) {
          arrowEl = document.createElement('div');
          arrowEl.classList.add('arrow');
          this.tooltipEl.appendChild(arrowEl);
        }
      } else {
        arrowEl?.remove();
        arrowEl = null;
      }
      return arrowEl;
    }

    return null;
  }

  private styleTextToObject(style: string): any {
    const customStyleObject: any = {};
    style
      .split(';')
      .filter((item) => item.trim())
      .forEach((item) => {
        const kv = item.split(':');
        if (kv.length > 1) {
          customStyleObject[this.snakeToCamelName(kv[0].trim())] = kv[1].trim();
        }
      });
    return customStyleObject;
  }

  private appendStylesForTooltip(): void {
    if (!this.tooltipEl) {
      return;
    }

    if (this.options.class) {
      this.tooltipEl.setAttribute('class', this.options.class);
    }

    const styleObject = this.options.style || {};

    this.tooltipEl.setAttribute(
      'style',
      Object.keys(styleObject)
        .map((key) => `${this.camelToSnakeName(key)}: ${(<any>styleObject)[key]}`)
        .join(';'),
    );
    this.tooltipEl.style.position = 'absolute';
    this.tooltipEl.style.display = 'none';

    const arrowEl = this.tooltipEl.querySelector('.arrow') as HTMLElement;
    if (arrowEl) {
      arrowEl.style.position = 'absolute';
      arrowEl.style.display = 'block';
      arrowEl.style.transform = 'rotate(45deg)';
      arrowEl.style.width = this.options?.arrow!;
      arrowEl.style.height = this.options?.arrow!;
      arrowEl.style.pointerEvents = 'none';
      arrowEl.style.backgroundColor = this.tooltipEl.style.backgroundColor;
      arrowEl.style.borderColor = this.tooltipEl.style.borderColor;
    }
  }
}
