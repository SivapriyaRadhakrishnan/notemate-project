import {
  FileText,
  Clock3,
  CheckCircle2,
  Wallet,
} from "lucide-react";

interface DashboardStatsProps {
  total: number;
  active: number;
  completed: number;
  financial: number;
  financialLabel: string;
}

const DashboardStats = ({
  total,
  active,
  completed,
  financial,
  financialLabel,
}: DashboardStatsProps) => {
  const statsList = [
    {
      title: "Total Orders",
      value: total.toString(),
      icon: FileText,
    },
    {
      title: "Active Tasks",
      value: active.toString(),
      icon: Clock3,
    },
    {
      title: "Completed",
      value: completed.toString(),
      icon: CheckCircle2,
    },
    {
      title: financialLabel,
      value: `₹${financial.toLocaleString()}`,
      icon: Wallet,
    },
  ];

  return (
    <div
      className="
        grid gap-5
        sm:grid-cols-2
        xl:grid-cols-4
      "
    >
      {statsList.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.title}
            className="
              relative overflow-hidden
              rounded-3xl
              border border-white/10
              bg-white/5
              p-6
              backdrop-blur-xl
            "
          >
            {/* Glow */}
            <div
              className="
                absolute right-0 top-0
                h-24 w-24
                rounded-full
                bg-violet-500/10
                blur-3xl
              "
            />

            <div
              className="
                relative flex
                items-start
                justify-between
              "
            >
              <div>
                <p
                  className="
                    text-sm text-white/50
                  "
                >
                  {item.title}
                </p>

                <h2
                  className="
                    mt-3 text-3xl
                    font-black text-white
                  "
                >
                  {item.value}
                </h2>
              </div>

              <div
                className="
                  flex h-14 w-14
                  items-center justify-center
                  rounded-2xl
                  bg-gradient-to-br
                  from-violet-600
                  to-blue-600
                  shadow-lg
                  shadow-violet-500/20
                "
              >
                <Icon
                  size={26}
                  className="text-white"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardStats;