import { motion } from "framer-motion";

import Button from "../ui/button";
import GradientText from "../ui/gradient-text";
import FloatingCard from "./floating-card";

import {
  fadeUp,
  staggerContainer,
} from "../../lib/animations";

const Hero = () => {
  return (
    <section
      className="
        relative overflow-hidden
        px-6 py-12 lg:py-16
      "
    >
      {/* Background Glow */}
      <div
        className="
          absolute left-1/2 top-0
          h-[500px] w-[500px]
          -translate-x-1/2
          rounded-full
          bg-violet-600/20
          blur-3xl
        "
      />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="
          relative mx-auto
          grid max-w-7xl
          items-center gap-10
          lg:grid-cols-2
        "
      >
        {/* LEFT SIDE */}
        <motion.div
          variants={fadeUp}
          className="space-y-6"
        >
          {/* Badge */}
          <div
            className="
              inline-flex items-center gap-2
              rounded-full
              border border-white/10
              bg-white/5
              px-4 py-2
              text-sm text-white/70
              backdrop-blur-md
            "
          >
            Trusted by College Customer s
          </div>

          {/* Heading */}
          <div className="space-y-4">
           <h1
  className="
    max-w-[620px]
    text-2xl font-black
    leading-[1.05]
    tracking-tight
    sm:text-5xl
    lg:text-[72px]
  "
>
  Get Your Handwritten
  <br />
  Assignments Done Fast
</h1>
            <h2
              className="text-2xl font-bold lg:text-4xl">
              <GradientText>
                By Verified Customer  Writers
              </GradientText>
            </h2>
          </div>

          {/* Description */}
          <p
            className="
              max-w-2xl
              text-base leading-relaxed
              text-white/70
            "
          >
            Upload assignments, connect with
            verified writers, track progress
            in real-time, and get quality
            handwritten work delivered on time.
          </p>

          {/* Buttons */}
          <div className="flex flex-wrap gap-4">
            <Button size="lg">
              Post Assignment
            </Button>

            <Button
              variant="secondary"
              size="lg"
            >
              Become a Writer
            </Button>
          </div>

          {/* Trust */}
          <div
            className="
              flex flex-wrap items-center
              gap-4 pt-2
              text-sm text-white/50
            "
          >
            <span>✔ Verified Writers</span>
            <span>✔ Real-time Tracking</span>
            <span>✔ Secure Payments</span>
          </div>
        </motion.div>

        {/* RIGHT SIDE */}
        <motion.div
          variants={fadeUp}
          className="
            relative flex
           min-h-[380px]
            items-center justify-center
          "
        >
          <FloatingCard
            title="Assignment Uploaded"
            description="Computer Networks Record • 24 Pages • Urgent"
            className="
              absolute left-0 top-10
              w-[260px]
            "
          />

          <FloatingCard
            title="Writer Accepted Task"
            description="Anjali S. • ⭐ 4.9 Rating"
            className="
              absolute right-0 top-40
              w-[240px]
            "
          />

          <FloatingCard
            title="Progress Update"
            description="12/24 Pages Completed"
            className="
              absolute bottom-10 left-20
              w-[250px]
            "
          />

          {/* Center Glow */}
          <div
            className="
              h-72 w-72 rounded-full
              bg-gradient-to-br
              from-violet-500/30
              to-blue-500/30
              blur-3xl
            "
          />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;