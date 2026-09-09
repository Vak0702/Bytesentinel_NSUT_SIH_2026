import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { TrustStrip } from "@/components/TrustStrip";
import { CapabilityGrid } from "@/components/CapabilityGrid";
import { DocumentIntelligence } from "@/components/DocumentIntelligence";
import { VerificationTimeline } from "@/components/VerificationTimeline";
import { ProductPreview } from "@/components/ProductPreview";
import { WhyVeridex } from "@/components/WhyDASTAVEZ";
import { UseCases } from "@/components/UseCases";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative">
      <Navbar />
      <Hero />
      <TrustStrip />
      <CapabilityGrid />
      <DocumentIntelligence />
      <VerificationTimeline />
      <ProductPreview />
      <WhyVeridex />
      <UseCases />
      <Footer />
    </main>
  );
}
