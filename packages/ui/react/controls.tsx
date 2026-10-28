import {
  createContext,
  useContext,
  useId,
  type ButtonHTMLAttributes,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";
import {
  Input as AntInput,
  InputNumber as AntInputNumber,
  Select as AntSelect,
  Checkbox as AntCheckbox,
  type InputProps,
  type InputNumberProps,
  type SelectProps,
  type CheckboxProps,
} from "antd";
import type { TextAreaProps } from "antd/es/input";

type FieldState = {
  id: string;
  describedBy?: string;
  invalid: boolean;
  required: boolean;
  disabled: boolean;
};
const FieldContext = createContext<FieldState | undefined>(undefined);
const classes = (...values: (string | undefined | false)[]) =>
  values.filter(Boolean).join(" ");

/** One label and one control. Nest another Field to start a new association. */
export function Field({
  id,
  label,
  description,
  error,
  required = false,
  disabled = false,
  children,
  className,
}: {
  id?: string;
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const generated = useId();
  const controlId = id ?? `field-${generated}`;
  const invalid = Boolean(error);
  const describedBy =
    classes(
      description ? `${controlId}-description` : undefined,
      invalid ? `${controlId}-error` : undefined,
    ) || undefined;
  return (
    <FieldContext.Provider
      value={{ id: controlId, describedBy, invalid, required, disabled }}
    >
      <div
        className={classes("ui-field", className)}
        data-invalid={invalid || undefined}
        data-disabled={disabled || undefined}
      >
        <label className="ui-field-label" htmlFor={controlId}>
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </label>
        {children}
        {description && (
          <p className="ui-field-description" id={`${controlId}-description`}>
            {description}
          </p>
        )}
        {invalid && (
          <p className="ui-field-error" id={`${controlId}-error`} role="alert">
            {error}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

type AccessibleControl = {
  id?: string;
  disabled?: boolean;
  required?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
};
function useField(props: AccessibleControl) {
  const field = useContext(FieldContext);
  return {
    id: field?.id ?? props.id,
    disabled: props.disabled ?? field?.disabled,
    required: props.required ?? field?.required,
    "aria-required": props.required ?? field?.required,
    "aria-invalid": props["aria-invalid"] ?? (field?.invalid || undefined),
    "aria-describedby":
      classes(field?.describedBy, props["aria-describedby"]) || undefined,
    status: field?.invalid ? ("error" as const) : undefined,
  };
}

export function Input({ className, ...props }: InputProps) {
  const field = useField(props);
  return (
    <AntInput
      {...props}
      {...field}
      status={field.status ?? props.status}
      className={classes("ui-input", className)}
    />
  );
}
export function TextArea({ className, ...props }: TextAreaProps) {
  const field = useField(props);
  return (
    <AntInput.TextArea
      {...props}
      {...field}
      status={field.status ?? props.status}
      className={classes("ui-input", className)}
    />
  );
}
export function NumberInput({ className, ...props }: InputNumberProps<number>) {
  const field = useField(props);
  return (
    <AntInputNumber<number>
      {...props}
      {...field}
      status={field.status ?? props.status}
      className={classes("ui-number-input", className)}
    />
  );
}
export function Select<Value extends string = string>({
  className,
  ...props
}: Omit<SelectProps<Value>, "mode"> & { required?: boolean }) {
  const field = useField(props);
  return (
    <AntSelect<Value>
      {...props}
      {...field}
      status={field.status ?? props.status}
      className={classes("ui-select", className)}
    />
  );
}
/** Standalone checkbox: the visible children are its accessible label. */
export function Checkbox({
  className,
  children,
  ...props
}: CheckboxProps & { children: ReactNode }) {
  return (
    <AntCheckbox {...props} className={classes("ui-checkbox", className)}>
      {children}
    </AntCheckbox>
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet";
  tone?: "neutral" | "danger";
  size?: "small" | "default" | "large";
  loading?: boolean;
};
export function Button({
  variant = "secondary",
  tone = "neutral",
  size = "default",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes("ui-button", className)}
      data-variant={variant}
      data-tone={tone}
      data-size={size}
    >
      {loading && <span className="ui-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
export function IconButton({
  label,
  children,
  className,
  ...props
}: Omit<ButtonProps, "aria-label" | "children"> & {
  label: string;
  children: ReactNode;
}) {
  return (
    <Button
      {...props}
      aria-label={label}
      className={classes("ui-icon-button", className)}
    >
      <span aria-hidden="true">{children}</span>
    </Button>
  );
}
export function Link({
  className,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a {...props} className={classes("ui-link", className)}>
      {children}
    </a>
  );
}
