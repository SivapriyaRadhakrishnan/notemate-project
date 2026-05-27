import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-2xl font-medium transition-all duration-300 focus:outline-none cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 hover:scale-[1.02]",

        secondary:
          "bg-white/10 backdrop-blur-md border border-white/10 text-white hover:bg-white/15",

        outline:
          "border border-violet-500/40 text-white hover:bg-violet-500/10",

        ghost:
          "text-white hover:bg-white/10",
      },

      size: {
        sm: "px-4 py-2 text-sm",
        md: "px-6 py-3 text-sm",
        lg: "px-8 py-4 text-base",
      },
    },

    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

interface ButtonProps
  extends React.ComponentProps<typeof motion.button>,
    VariantProps<typeof buttonVariants> {}

const Button = ({
  className,
  variant,
  size,
  ...props
}: ButtonProps) => {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
};

export default Button;