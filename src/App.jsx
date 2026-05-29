import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Problem from './components/Problem';
import HowItWorks from './components/HowItWorks';
import Included from './components/Included';
import WhyJetHR from './components/WhyJetHR';
import SocialProof from './components/SocialProof';
import CTASection from './components/CTASection';
import Footer from './components/Footer';
import './index.css';

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Included />
        <WhyJetHR />
        <SocialProof />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
