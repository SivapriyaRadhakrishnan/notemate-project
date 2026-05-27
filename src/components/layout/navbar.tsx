import { useState } from "react";
import {
  motion,
  AnimatePresence,
} from "framer-motion";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import Button from "../ui/button";

const navItems = [
  { label: "Home", to: "/" },
  { label: "How it Works", to: "#how-it-works" },
  { label: "Become a Writer", to: "/writer-application" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="
        sticky top-0 z-50
        border-b border-white/10
        bg-[#0F172A]/80
        backdrop-blur-xl
      "
    >
      <div
        className="
          mx-auto flex
          max-w-7xl
          items-center
          justify-between
          px-6 py-4
        "
      >
        {/* Logo */}
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

          <h1
            className="
              text-xl font-bold
              tracking-tight
              sm:text-2xl
            "
          >
            NoteMate
          </h1>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="group relative text-sm text-white/80 transition-colors duration-300 hover:text-white"
            >
              {item.label}

              <span
                className="
                  absolute -bottom-1 left-0
                  h-[2px] w-0
                  bg-gradient-to-r
                  from-violet-500
                  to-blue-500
                  transition-all duration-300
                  group-hover:w-full
                "
              />
            </Link>
          ))}
        </div>

        {/* Desktop Buttons */}
        <div className="hidden items-center gap-3 md:flex">
          <Link to="/login">
  <Button variant="ghost">
    Login
  </Button>
</Link>

<Link to="/signup">
  <Button>
    Sign Up
  </Button>
</Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="
            flex items-center justify-center
            rounded-xl
            border border-white/10
            bg-white/5
            p-2
            text-white
            md:hidden
          "
        >
          {isOpen ? (
            <X size={22} />
          ) : (
            <Menu size={22} />
          )}
        </button>
      </div>

      {/* Mobile Popup Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{
              opacity: 0,
              y: -10,
              scale: 0.95,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: -10,
              scale: 0.95,
            }}
            transition={{
              duration: 0.2,
            }}
            className="
              absolute right-4 top-[80px]
              z-50
              w-[220px]
              rounded-2xl
              border border-white/10
              bg-[#0F172A]/95
              p-5
              shadow-2xl
              shadow-black/40
              backdrop-blur-2xl
              md:hidden
            "
          >
            <div className="flex flex-col gap-5">

              {/* Nav Items */}
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="text-left text-white/80 transition-colors hover:text-white"
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              ))}

              {/* Buttons */}
              <div className="flex flex-col gap-3 pt-2">
                <Button
  variant="ghost"
  className="w-full"
>
  Login
</Button>

<Button className="w-full">
  Sign Up
</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;