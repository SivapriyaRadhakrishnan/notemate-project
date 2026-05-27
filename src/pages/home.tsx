import Navbar from "../components/layout/navbar";
import Hero from "../components/home/hero";
import HowItWorks from "../components/home/how-it-works";
import Features from "../components/home/features";
import Footer from "../components/layout/footer";
import Testimonials from "../components/home/testimonials";
import CTA from "../components/home/cta";

const Home = () => {
  return (
    <main className="min-h-screen bg-[#0F172A] text-white overflow-hidden">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <Testimonials />
      <CTA />
      <Footer/>
    </main>
  );
};

export default Home;