import type { ComponentProps, HTMLAttributes } from "react";
import { cn, eyebrowStyles, textLinkStyles } from "../recipes";

export function Eyebrow({
  as: Tag = "p",
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { as?: "p" | "span" }) {
  return <Tag {...props} className={cn(eyebrowStyles, className)} />;
}

export function TextLink({ className, ...props }: ComponentProps<"a">) {
  return (
    <a {...props} className={`text-link ${cn(textLinkStyles, className)}`} />
  );
}
