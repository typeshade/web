import { ThemeSwitch } from "@typeshade/site-ui/react";
export default function ThemeControl(props: {
  darkLabel: string;
  lightLabel: string;
}) {
  return (
    <ThemeSwitch
      {...props}
      storageKey="typenn-theme"
      changeEvent="typenn-theme-change"
    />
  );
}
