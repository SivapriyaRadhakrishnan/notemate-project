import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

interface FloatingCardProps {
  title: string;
  description: string;
  className?: string;
}

const FloatingCard = ({
  title,
  description,
  className,
}: FloatingCardProps) => {
  return (
    <motion.div
      animate={{
        y: [0, -10, 0],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={cn(
        `
        rounded-3xl
        border border-white/10
        bg-white/5
        backdrop-blur-xl
        p-5
        shadow-2xl
        shadow-violet-500/10
        `,
        className
      )}
    >
      <h3 className="text-sm font-semibold text-white">
        {title}
      </h3>

      <p className="mt-2 text-sm text-white/70">
        {description}
      </p>
    </motion.div>
  );
};

export default FloatingCard;