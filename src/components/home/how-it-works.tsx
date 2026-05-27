import { motion } from "framer-motion";
import {
  Upload,
  PenTool,
  PackageCheck,
} from "lucide-react";

const steps = [
  {
    title: "Upload Assignment",
    description:
      "Submit your assignment details, deadline, and page requirements easily.",
    icon: Upload,
  },
  {
    title: "Writer Accepts Task",
    description:
      "Verified Customer  writers bid and start working on your assignment.",
    icon: PenTool,
  },
  {
    title: "Receive Delivery",
    description:
      "Track progress live and receive quality handwritten work on time.",
    icon: PackageCheck,
  },
];

const HowItWorks = () => {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-7xl">

        {/* Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <h2
            className="
              text-3xl font-black
              tracking-tight
              sm:text-4xl
              lg:text-5xl
            "
          >
            How NoteMate Works
          </h2>

          <p
            className="
              mt-4 text-base
              leading-relaxed
              text-white/70
              sm:text-lg
            "
          >
            Get handwritten assignments completed
            faster with our simple workflow.
          </p>
        </div>

        {/* Cards */}
        <div
          className="
            mt-16 grid gap-6
            md:grid-cols-3
          "
        >
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <motion.div
                key={step.title}
                initial={{
                  opacity: 0,
                  y: 40,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.15,
                }}
                viewport={{ once: true }}
                whileHover={{
                  y: -6,
                }}
                className="
                  relative overflow-hidden
                  rounded-3xl
                  border border-white/10
                  bg-white/5
                  p-8
                  backdrop-blur-xl
                "
              >
                {/* Glow */}
                <div
                  className="
                    absolute right-0 top-0
                    h-32 w-32
                    rounded-full
                    bg-violet-500/10
                    blur-3xl
                  "
                />

                {/* Step Number */}
                <div
                  className="
                    mb-6 flex h-14 w-14
                    items-center justify-center
                    rounded-2xl
                    bg-gradient-to-br
                    from-violet-600
                    to-blue-600
                    shadow-lg shadow-violet-500/20
                  "
                >
                  <Icon size={26} />
                </div>

                <h3
                  className="
                    text-xl font-bold
                    text-white
                  "
                >
                  {step.title}
                </h3>

                <p
                  className="
                    mt-4 leading-relaxed
                    text-white/70
                  "
                >
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;