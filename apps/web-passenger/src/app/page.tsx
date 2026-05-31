import Navbar from '@/components/landing/Navbar';
import HeroSection from '@/components/landing/HeroSection';
import RoleSelectionSection from '@/components/landing/RoleSelectionSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import CoreFeaturesSection from '@/components/landing/CoreFeaturesSection';
import QueueSystemSection from '@/components/landing/QueueSystemSection';
import DriverBenefitsSection from '@/components/landing/DriverBenefitsSection';
import PassengerBenefitsSection from '@/components/landing/PassengerBenefitsSection';
import AppPreviewSection from '@/components/landing/AppPreviewSection';
import QrInviteSection from '@/components/landing/QrInviteSection';
import TestimonialSection from '@/components/landing/TestimonialSection';
import FaqSection from '@/components/landing/FaqSection';
import DownloadCtaSection from '@/components/landing/DownloadCtaSection';
import Footer from '@/components/landing/Footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#04070B] flex flex-col font-kanit">
      <Navbar />
      <HeroSection />
      <RoleSelectionSection />
      <HowItWorksSection />
      <CoreFeaturesSection />
      <QueueSystemSection />
      <DriverBenefitsSection />
      <PassengerBenefitsSection />
      <AppPreviewSection />
      <QrInviteSection />
      <TestimonialSection />
      <FaqSection />
      <DownloadCtaSection />
      <Footer />
    </main>
  );
}
