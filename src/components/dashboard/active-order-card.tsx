import { CalendarDays } from "lucide-react";

interface ActiveOrderCardProps {
  title: string;
  subject: string;
  progress: number;
  dueDate: string;
  status: string;
}

const ActiveOrderCard = ({
  title,
  subject,
  progress,
  dueDate,
  status,
}: ActiveOrderCardProps) => {
  return (
    <div
      className="
        rounded-3xl
        border border-white/10
        bg-white/5
        p-6
        backdrop-blur-xl
      "
    >
      {/* Top */}
      <div className="flex items-start justify-between">
        <div>
          <h3
            className="
              text-xl font-bold
              text-white
            "
          >
            {title}
          </h3>

          <p className="mt-1 text-white/50">
            {subject}
          </p>
        </div>

        {/* Status */}
        <div
          className="
            rounded-full
            bg-violet-500/10
            px-4 py-2
            text-sm font-medium
            text-violet-400
          "
        >
          {status}
        </div>
      </div>

      {/* Progress */}
      <div className="mt-6">
        <div className="mb-2 flex justify-between">
          <p className="text-sm text-white/50">
            Progress
          </p>

          <p className="text-sm text-white">
            {progress}%
          </p>
        </div>

        <div
          className="
            h-3 overflow-hidden
            rounded-full
            bg-white/10
          "
        >
          <div
            className="
              h-full rounded-full
              bg-gradient-to-r
              from-violet-500
              to-blue-500
            "
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </div>

      {/* Bottom */}
      <div
        className="
          mt-6 flex
          items-center
          justify-between
        "
      >
        <div className="flex items-center gap-2">
          <CalendarDays
            size={18}
            className="text-white/50"
          />

          <p className="text-sm text-white/60">
            Due {dueDate}
          </p>
        </div>

        <button
          className="
            rounded-2xl
            bg-gradient-to-r
            from-violet-600
            to-blue-600
            px-5 py-2
            text-sm font-medium
            text-white
            transition-all duration-300

            hover:scale-105
          "
        >
          Track
        </button>
      </div>
    </div>
  );
};

export default ActiveOrderCard;