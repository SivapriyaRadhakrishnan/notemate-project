import { motion } from "framer-motion";

import {
  ShieldCheck,
  Clock3,
  Wallet,
  BadgeCheck,
  Truck,
  Sparkles,
} from "lucide-react";

const features = [
  {
    title: "Verified Writers",
    description:
      "Work only with trusted and verified Customer  writers.",
    icon: ShieldCheck,
  },
  {
    title: "Fast Delivery",
    description:
      "Get assignments completed before your deadline.",
    icon: Clock3,
  },
  {
    title: "Secure Payments",
    description:
      "Safe payment system with transparent transactions.",
    icon: Wallet,
  },
  {
    title: "Quality Assurance",
    description:
      "Assignments reviewed carefully for neat handwriting and quality.",
    icon: BadgeCheck,
  },
  {
    title: "Live Tracking",
    description:
      "Track assignment progress in real-time from start to finish.",
    icon: Truck,
  },
  {
    title: "Premium Experience",
    description:
      "Modern platform experience designed for Customer s.",
    icon: Sparkles,
  },
];

const Features = () => {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-7xl">

        {/* Heading */}
        <div className="max-w-3xl">
          <h2
            className="
              text-3xl font-black
              tracking-tight
              sm:text-4xl
              lg:text-5xl
            "
          >
            Why Customer s Choose NoteMate
          </h2>

          <p
            className="
              mt-4 text-base
              leading-relaxed
              text-white/70
              sm:text-lg
            "
          >
            Everything you need to manage handwritten
            assignments efficiently and stress-free.
          </p>
        </div>

        {/* Feature Grid */}
        <div
          className="
            mt-14 grid gap-6
            sm:grid-cols-2
            lg:grid-cols-3
          "
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.div
                key={feature.title}
                initial={{
                  opacity: 0,
                  y: 30,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.08,
                }}
                viewport={{ once: true }}
                whileHover={{
                  y: -5,
                }}
                className="
                  relative overflow-hidden
                  rounded-3xl
                  border border-white/10
                  bg-white/5
                  p-7
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

                {/* Icon */}
                <div
                  className="
                    flex h-14 w-14
                    items-center justify-center
                    rounded-2xl
                    bg-gradient-to-br
                    from-violet-600
                    to-blue-600
                    shadow-lg shadow-violet-500/20
                  "
                >
                  <Icon size={24} />
                </div>

                {/* Content */}
                <h3
                  className="
                    mt-6 text-xl
                    font-bold text-white
                  "
                >
                  {feature.title}
                </h3>

                <p
                  className="
                    mt-3 leading-relaxed
                    text-white/70
                  "
                >
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;