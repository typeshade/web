export type MenuItem =
  | {
      label: string;
      action: () => void;
      id?: string;
      shortcut?: string;
      disabled?: boolean;
      checked?: boolean;
      danger?: boolean;
    }
  | { separator: true };

export type MenuState = {
  key: string;
  label: string;
  x: number;
  y: number;
  items: MenuItem[];
  origin: HTMLElement | SVGElement | null;
};

export interface TooltipState {
  text: string;
  anchor: HTMLElement;
  described: HTMLElement;
}
