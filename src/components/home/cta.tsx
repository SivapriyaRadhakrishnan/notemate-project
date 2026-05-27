import { motion } from "framer-motion";

import Button from "../ui/button";
import GradientText from "../ui/gradient-text";

const CTA = () => {
  return (
    <section className="px-6 py-20">
      <motion.div
        initial={{
          opacity: 0,
          y: 30,
        }}
        whileInView={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.5,
        }}
        viewport={{ once: true }}
        className="
          relative mx-auto
          max-w-6xl overflow-hidden
          rounded-[40px]
          border border-white/10
          bg-white/5
          px-8 py-20
          text-center
          backdrop-blur-2xl
          sm:px-16
        "
      >
        {/* Glow Effects */}
        <div
          className="
            absolute left-0 top-0
            h-72 w-72
            rounded-full
            bg-violet-500/20
            blur-3xl
          "
        />

        <div
          className="
            absolute bottom-0 right-0
            h-72 w-72
            rounded-full
            bg-blue-500/20
            blur-3xl
          "
        />

        {/* Content */}
        <div className="relative">
          <h2
            className="
              text-4xl font-black
              leading-tight tracking-tight
              sm:text-5xl
              lg:text-6xl
            "
          >
            Ready to Simplify
            <br />

            <GradientText>
              Your Assignment Workflow?
            </GradientText>
          </h2>

          <p
            className="
              mx-auto mt-6
              max-w-2xl
              text-base leading-relaxed
              text-white/70
              sm:text-lg
            "
          >
            Join Customer s already using NoteMate
            to complete handwritten assignments
            faster and stress-free.
          </p>

          {/* Buttons */}
          <div
            className="
              mt-10 flex
              flex-wrap items-center
              justify-center gap-4
            "
          >
            <Button size="lg">
              Get Started
            </Button>

            <Button
              variant="secondary"
              size="lg"
            >
              Become a Writer
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default CTA;