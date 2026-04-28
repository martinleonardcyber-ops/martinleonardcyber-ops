import { useRef } from "react";
import { Navbar }        from "@/components/Navbar";
import { Hero }          from "@/components/Hero";
import { ServicesBento } from "@/components/ServicesBento";
import { Pourquoi }      from "@/components/Pourquoi";
import { Process }       from "@/components/Process";
import { Stats }         from "@/components/Stats";
import { Testimonials }  from "@/components/Testimonials";
import { Faq }           from "@/components/Faq";
import { CtaFooter }     from "@/components/CtaFooter";

export default function App() {
  const heroRef = useRef<HTMLElement>(null);

  return (
    <div className="bg-background text-foreground min-h-screen">
      <Navbar />
      <main>
        <Hero scrollRef={heroRef} />
        <ServicesBento />
        <Pourquoi />
        <Process />
        <Stats />
        <Testimonials />
        <Faq />
        <CtaFooter />
      </main>
    </div>
  );
}
