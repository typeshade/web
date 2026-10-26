import { ThemeSwitch } from "@typeshade/site-ui/react/theme";
export default function ThemeControl(props: {
  darkLabel: string;
  lightLabel: string;
}) {
  return (
    <ThemeSwitch
      {...props}
      storageKey="typecv-theme"
      changeEvent="typecv-theme-change"
    />
  );
}
