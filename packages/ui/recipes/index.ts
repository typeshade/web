import { cva, type VariantProps } from "class-variance-authority";
export { cn } from "./cn";
type NonNullVariants<T> = { [Key in keyof T]: Exclude<T[Key], null> };

export const focusRing =
  "focus-visible:outline-solid focus-visible:outline-(length:--ui-focus-width) focus-visible:outline-ui-focus focus-visible:outline-offset-(--ui-focus-offset)";
const hidden = "[&[hidden]]:hidden";

export const buttonVariants = cva(
  [
    "ui-button inline-flex items-center justify-center gap-ui-2 max-w-full rounded-ui-control border border-solid",
    "font-ui-sans text-(length:--ui-font-size-control) font-medium leading-normal text-center no-underline whitespace-normal wrap-anywhere cursor-pointer",
    "transition-colors duration-(--ui-motion-duration) motion-reduce:transition-none",
    "disabled:text-ui-disabled-text disabled:bg-ui-surface-muted disabled:border-ui-border disabled:cursor-not-allowed",
    "[@media(pointer:coarse)]:min-h-ui-control-large [&:lang(ko)]:font-semibold",
    "forced-colors:border-[ButtonText] forced-colors:disabled:text-[GrayText] forced-colors:disabled:border-[GrayText]",
    focusRing,
    hidden,
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-ui-accent text-ui-on-accent border-ui-accent [&:hover:not(:disabled)]:bg-ui-accent-hover [&:hover:not(:disabled)]:text-ui-on-accent [&:hover:not(:disabled)]:border-ui-accent-hover [&:active:not(:disabled)]:bg-ui-accent-active",
        secondary:
          "bg-ui-surface text-ui-text border-ui-border-control [&:hover:not(:disabled)]:bg-ui-surface-muted [&:hover:not(:disabled)]:text-ui-focus [&:hover:not(:disabled)]:border-ui-focus [&:active:not(:disabled)]:bg-ui-surface-muted",
        quiet:
          "bg-transparent text-ui-text border-transparent [&:hover:not(:disabled)]:bg-ui-surface-muted [&:hover:not(:disabled)]:text-ui-focus [&:hover:not(:disabled)]:border-ui-focus [&:active:not(:disabled)]:bg-ui-surface-muted",
      },
      tone: {
        neutral: "",
        danger:
          "text-ui-danger border-ui-danger [&:hover:not(:disabled)]:text-ui-danger [&:hover:not(:disabled)]:border-ui-danger",
      },
      size: {
        small: "min-h-ui-control-small px-ui-2 py-0.5",
        default: "min-h-ui-control px-3.5 py-1.5",
        large: "min-h-ui-control-large px-ui-4 py-ui-2 text-base",
      },
    },
    compoundVariants: [
      {
        variant: "primary",
        tone: "danger",
        class:
          "bg-ui-danger text-ui-surface [&:hover:not(:disabled)]:bg-ui-danger [&:hover:not(:disabled)]:text-ui-surface [&:active:not(:disabled)]:bg-ui-danger",
      },
    ],
    defaultVariants: { variant: "secondary", tone: "neutral", size: "default" },
  },
);
export type ButtonVariants = NonNullVariants<
  VariantProps<typeof buttonVariants>
>;

export const iconButtonStyles =
  "ui-icon-button min-w-ui-control px-ui-2 [&>span]:inline-flex [&_svg]:size-[18px]";
export const linkStyles = `ui-link text-ui-focus underline underline-offset-[3px] ${focusRing}`;
export const spinnerStyles =
  "ui-spinner size-[1em] flex-none rounded-full border-2 border-solid border-current border-r-transparent animate-spin [animation-duration:0.8s] motion-reduce:animate-none";
export const fieldStyles = {
  root: `ui-field group/ui-field grid content-start gap-ui-2 min-w-0 ${hidden}`,
  label:
    "ui-field-label text-ui-text text-(length:--ui-font-size-label) font-medium leading-normal group-data-[disabled]/ui-field:text-ui-text-muted",
  description:
    "ui-field-description m-0 text-ui-text-muted text-(length:--ui-font-size-label) leading-normal wrap-anywhere",
  error: `ui-field-error m-0 text-ui-danger text-(length:--ui-font-size-label) leading-normal wrap-anywhere ${hidden}`,
};
export const nativeControlStyles = [
  "ui-native-control w-full min-w-0 min-h-ui-control rounded-ui-control border border-solid border-ui-border-control px-2.5 py-1.5",
  "bg-ui-surface text-ui-text font-[inherit] text-(length:--ui-font-size-control)",
  "disabled:text-ui-disabled-text disabled:bg-ui-surface-muted disabled:cursor-not-allowed aria-invalid:border-ui-danger",
  "[&:is(textarea)]:resize-y",
  focusRing,
  hidden,
].join(" ");
export const checkboxStyles = {
  root: "ui-native-checkbox inline-flex gap-ui-2 items-center text-ui-text text-(length:--ui-font-size-label)",
  input: `size-[18px] accent-ui-accent ${focusRing}`,
};
export const toolbarStyles = `ui-toolbar flex items-center flex-wrap gap-ui-2 ${hidden}`;
export const panelStyles = `ui-panel min-w-0 p-ui-6 border border-solid border-ui-border rounded-ui-panel bg-ui-surface text-ui-text ${hidden}`;
export const emptyStateStyles = `ui-empty-state grid content-center gap-ui-3 min-h-32 p-ui-6 text-ui-text-muted text-center ${hidden}`;
export const alertVariants = cva(
  [
    "ui-alert px-ui-4 py-ui-3 border border-solid border-ui-border border-s-[3px] rounded-ui-control bg-ui-surface-muted text-ui-text wrap-anywhere",
    "[&>:first-child]:mt-0 [&>:last-child]:mb-0",
    hidden,
  ],
  {
    variants: {
      tone: {
        info: "border-s-ui-focus",
        danger: "border-s-ui-danger",
        success: "border-s-ui-success",
      },
    },
    defaultVariants: { tone: "info" },
  },
);
export type AlertVariants = NonNullVariants<VariantProps<typeof alertVariants>>;
export const tabListStyles =
  "ui-tablist flex overflow-x-auto gap-ui-3 border-b border-solid border-ui-border";
export const tabStyles = [
  "flex-none min-h-ui-control-large px-1 py-ui-2 border-0 border-b-2 border-solid border-transparent bg-transparent text-ui-text-muted font-[inherit] cursor-pointer",
  "aria-selected:border-b-ui-focus aria-selected:text-ui-focus aria-selected:font-semibold disabled:text-ui-disabled-text disabled:cursor-not-allowed",
  focusRing,
].join(" ");
export const tabPanelStyles = `py-ui-4 ${focusRing} ${hidden}`;
export const dialogStyles = [
  "ui-dialog w-[min(520px,calc(100vw-32px))] max-h-[calc(100dvh-32px)] m-auto p-ui-6 overflow-auto",
  "border border-solid border-ui-border rounded-ui-panel bg-ui-surface text-ui-text font-ui-sans shadow-[0_12px_48px_rgb(0_0_0/0.24)]",
  "backdrop:bg-black/60 [&_.ui-field]:my-ui-4",
].join(" ");
