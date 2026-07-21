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

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <Ticker />
      <Manifesto />
      <Services />
      <Statement />
      <Portfolio />
      <Studio />
      <Process />
      <ContactForm />
      <Footer />
    </main>
  );
}
