interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const AuthLayout = ({
  title,
  subtitle,
  children,
}: AuthLayoutProps) => {
  return (
    <div
      className="
        relative flex min-h-screen
        overflow-hidden
        bg-[#020617]
      "
    >
      {/* Background Glow */}
      <div
        className="
          absolute left-0 top-0
          h-[400px] w-[400px]
          rounded-full
          bg-violet-600/20
          blur-3xl
        "
      />

      <div
        className="
          absolute bottom-0 right-0
          h-[400px] w-[400px]
          rounded-full
          bg-blue-600/20
          blur-3xl
        "
      />

      {/* LEFT SIDE */}
      <div
        className="
          relative hidden flex-1
          flex-col justify-between
          border-r border-white/10
          p-12 lg:flex
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
            "
          />

          <h1 className="text-2xl font-bold text-white">
            NoteMate
          </h1>
        </div>

        {/* Text */}
        <div className="max-w-lg">
          <h2
            className="
              text-5xl font-black
              leading-tight
              text-white
            "
          >
            Manage Assignments
            <br />
            Smarter & Faster.
          </h2>

          <p
            className="
              mt-6 text-lg
              leading-relaxed
              text-white/70
            "
          >
            Connect with verified writers,
            track progress in real-time,
            and simplify handwritten
            assignment workflows.
          </p>
        </div>

        {/* Footer */}
        <p className="text-sm text-white/40">
          © 2026 NoteMate
        </p>
      </div>

      {/* RIGHT SIDE */}
      <div
        className="
          relative flex flex-1
          items-center justify-center
          px-6 py-12
        "
      >
        <div className="w-full max-w-md">
          {/* Heading */}
          <div className="mb-8">
            <h2
              className="
                text-4xl font-black
                text-white
              "
            >
              {title}
            </h2>

            <p className="mt-3 text-white/60">
              {subtitle}
            </p>
          </div>

          {/* Form */}
          <div
            className="
              rounded-3xl
              border border-white/10
              bg-white/5
              p-8
              backdrop-blur-2xl
            "
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;