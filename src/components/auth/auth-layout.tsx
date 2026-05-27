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
        items-center justify-center
        overflow-hidden
        bg-[#020617]
        px-6 py-12
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

      {/* Grid Background */}
      <div
        className="
          absolute inset-0
          opacity-30
        "
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Auth Card */}
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
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

            <h1 className="text-2xl font-bold text-white">
              NoteMate
            </h1>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-8 text-center">
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

        {/* Form Card */}
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
  );
};

export default AuthLayout;