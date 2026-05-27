import { cn } from "../../lib/utils";

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
}

const GradientText = ({
  children,
  className,
}: GradientTextProps) => {
  return (
    <span
      className={cn(
        `
        bg-gradient-to-r
        from-violet-400
        via-blue-400
        to-cyan-400
        bg-clip-text
        text-transparent
        `,
        className
      )}
    >
      {children}
    </span>
  );
};

export default GradientText;