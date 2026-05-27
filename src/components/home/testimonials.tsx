import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Arjun Nair",
    role: "B.Tech Customer ",
    review:
      "NoteMate helped me submit my record work before deadline. The handwriting quality was excellent.",
  },
  {
    name: "Megha S",
    role: "Nursing Customer ",
    review:
      "The real-time tracking feature is amazing. I always knew the progress of my assignment.",
  },
  {
    name: "Rahul Krishna",
    role: "MBA Customer ",
    review:
      "Very professional writers and smooth experience overall. Saved me during internals.",
  },
];

const Testimonials = () => {
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
            Loved by Customer s
          </h2>

          <p
            className="
              mt-4 text-white/70
              sm:text-lg
            "
          >
            Customer s across colleges trust
            NoteMate for fast and reliable
            handwritten assignments.
          </p>
        </div>

        {/* Cards */}
        <div
          className="
            mt-16 grid gap-6
            md:grid-cols-3
          "
        >
          {testimonials.map(
            (testimonial, index) => (
              <motion.div
                key={testimonial.name}
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
                  delay: index * 0.1,
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
                    h-28 w-28
                    rounded-full
                    bg-violet-500/10
                    blur-3xl
                  "
                />

                {/* Stars */}
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={18}
                      className="
                        fill-yellow-400
                        text-yellow-400
                      "
                    />
                  ))}
                </div>

                {/* Review */}
                <p
                  className="
                    mt-6 leading-relaxed
                    text-white/70
                  "
                >
                  "{testimonial.review}"
                </p>

                {/* User */}
                <div className="mt-8 flex items-center gap-4">
                  <div
                    className="
                      flex h-12 w-12
                      items-center justify-center
                      rounded-full
                      bg-gradient-to-br
                      from-violet-600
                      to-blue-600
                      font-bold
                    "
                  >
                    {testimonial.name[0]}
                  </div>

                  <div>
                    <h3 className="font-semibold">
                      {testimonial.name}
                    </h3>

                    <p className="text-sm text-white/50">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          )}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;