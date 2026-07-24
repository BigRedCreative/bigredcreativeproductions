import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Ticker from "@/components/Ticker";
import Manifesto from "@/components/Manifesto";
import Statement from "@/components/Statement";
import Services from "@/components/Services";
import Portfolio from "@/components/Portfolio";
import Studio from "@/components/Studio";
import Process from "@/components/Process";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import BrandTokens from "@/components/BrandTokens";
import { isSectionEnabled } from "@/config/sections";

export default function Home() {
  return (
    <BrandTokens>
      <main>
        {isSectionEnabled("header") && <Header />}
        {isSectionEnabled("hero") && <Hero />}
        {isSectionEnabled("ticker") && <Ticker />}
        {isSectionEnabled("manifesto") && <Manifesto />}
        {isSectionEnabled("services") && <Services />}
        {isSectionEnabled("statement") && <Statement />}
        {isSectionEnabled("portfolio") && <Portfolio />}
        {isSectionEnabled("studio") && <Studio />}
        {isSectionEnabled("process") && <Process />}
        {isSectionEnabled("contact") && <ContactForm />}
        {isSectionEnabled("footer") && <Footer />}
      </main>
    </BrandTokens>
  );
}
