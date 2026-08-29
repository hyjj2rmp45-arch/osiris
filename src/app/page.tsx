import Hero from '@/components/landing/Hero';
import Differentiators from '@/components/landing/Differentiators';
import HowItWorks from '@/components/landing/HowItWorks';
import DashboardPreview from '@/components/landing/DashboardPreview';
import Features from '@/components/landing/Features';
import Pricing from '@/components/landing/Pricing';
import Footer from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <>
      <main>
        <Hero />
        <Differentiators />
        <HowItWorks />
        <DashboardPreview />
        <Features />
        <Pricing />
      </main>
      <Footer />
    </>
  );
}
