import { focusableElements } from "./focus";
/** Uses native modal Escape/inert behavior and keeps sequential focus inside the dialog. */
export function controlDialog(dialog: HTMLDialogElement) {
  let opener: HTMLElement | null = null;
  const restore = () => {
    const target = opener;
    opener = null;
    if (target?.isConnected && !document.querySelector("dialog[open]"))
      target.focus();
  };
  const key = (event: KeyboardEvent) => {
    if (event.key !== "Tab" || !dialog.open) return;
    const targets = focusableElements(dialog);
    const first = targets[0],
      last = targets.at(-1);
    if (!first) {
      event.preventDefault();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  dialog.addEventListener("close", restore);
  dialog.addEventListener("keydown", key);
  return {
    open(
      trigger: HTMLElement | null = document.activeElement as HTMLElement | null,
      initialFocus?: HTMLElement,
    ) {
      if (dialog.open) return;
      opener = trigger;
      dialog.showModal();
      initialFocus?.focus();
    },
    close(value?: string) {
      dialog.close(value);
    },
    destroy() {
      dialog.removeEventListener("close", restore);
      dialog.removeEventListener("keydown", key);
      opener = null;
    },
  };
}
