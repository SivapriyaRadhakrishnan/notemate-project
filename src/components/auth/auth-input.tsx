import { cn } from "../../lib/utils";

interface AuthInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const AuthInput = ({
  label,
  className,
  ...props
}: AuthInputProps) => {
  return (
    <div className="space-y-2">
      <label
        className="
          text-sm font-medium
          text-white/70
        "
      >
        {label}
      </label>

      <input
        className={cn(
          `
          w-full rounded-2xl
          border border-white/10
          bg-white/5
          px-4 py-3
          text-white
          outline-none
          transition-all duration-300

          placeholder:text-white/30

          focus:border-violet-500/40
          focus:bg-white/10
          `,
          className
        )}
        {...props}
      />
    </div>
  );
};

export default AuthInput;