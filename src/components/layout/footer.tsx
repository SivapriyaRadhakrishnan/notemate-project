import {
  Globe,
  Mail,
  Phone,
} from "lucide-react";

const Footer = () => {
  return (
    <footer
      className="
        relative overflow-hidden
        border-t border-white/10
        bg-[#0F172A]
        px-6 py-14
      "
    >
      {/* Glow */}
      <div
        className="
          absolute left-1/2 top-0
          h-72 w-72
          -translate-x-1/2
          rounded-full
          bg-violet-500/10
          blur-3xl
        "
      />

      <div
        className="
          relative mx-auto
          grid max-w-7xl gap-12
          md:grid-cols-4
        "
      >
        {/* Brand */}
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div
              className="
                h-10 w-10 rounded-2xl
                bg-gradient-to-br
                from-violet-600
                to-blue-600
                shadow-lg shadow-violet-500/30
              "
            />

            <h2 className="text-2xl font-bold">
              NoteMate
            </h2>
          </div>

          <p
            className="
              max-w-xs leading-relaxed
              text-white/60
            "
          >
            Simplifying handwritten assignment
            management for Customer s with a
            premium digital experience.
          </p>
        </div>

        {/* Product */}
        <div>
          <h3
            className="
              mb-5 text-lg
              font-semibold text-white
            "
          >
            Product
          </h3>

          <div className="space-y-3 text-white/60">
            <p className="cursor-pointer hover:text-white">
              Features
            </p>

            <p className="cursor-pointer hover:text-white">
              How It Works
            </p>

            <p className="cursor-pointer hover:text-white">
              Pricing
            </p>

            <p className="cursor-pointer hover:text-white">
              Writers
            </p>
          </div>
        </div>

        {/* Company */}
        <div>
          <h3
            className="
              mb-5 text-lg
              font-semibold text-white
            "
          >
            Company
          </h3>

          <div className="space-y-3 text-white/60">
            <p className="cursor-pointer hover:text-white">
              About
            </p>

            <p className="cursor-pointer hover:text-white">
              Careers
            </p>

            <p className="cursor-pointer hover:text-white">
              Contact
            </p>

            <p className="cursor-pointer hover:text-white">
              Privacy Policy
            </p>
          </div>
        </div>

        {/* Socials */}
        <div>
          <h3
            className="
              mb-5 text-lg
              font-semibold text-white
            "
          >
            Connect
          </h3>

          <div className="flex gap-4">
            {[Globe, Mail, Phone].map(
              (Icon, index) => (
                <button
                  key={index}
                  className="
                    flex h-11 w-11
                    items-center justify-center
                    rounded-2xl
                    border border-white/10
                    bg-white/5
                    text-white/70
                    transition-all duration-300
                    hover:-translate-y-1
                    hover:bg-white/10
                    hover:text-white
                  "
                >
                  <Icon size={20} />
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div
        className="
          relative mx-auto mt-14
          flex max-w-7xl
          flex-col items-center
          justify-between gap-4
          border-t border-white/10
          pt-6 text-sm
          text-white/50
          md:flex-row
        "
      >
        <p>
          © 2026 NoteMate. All rights reserved.
        </p>

       
      </div>
    </footer>
  );
};

export default Footer;