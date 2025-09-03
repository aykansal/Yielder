import { FeaturesSectionWithHoverEffects } from "@/components/feature-section-with-hover-effects";
import { SpinningText } from "@/components/magicui/spinning-text";
import TeamSection from "@/components/team";
import { Preview as TextRotateDemo } from "@/components/TextRotateDemo";
import { Github } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background relative">
      <SpinningText
        radius={4.5}
        className="fixed opacity-30 pointer-events-none md:right-20 md:bottom-20"
      >
        invest • earn • receive •
      </SpinningText>
      <section className="h-screen">
        <TextRotateDemo />
      </section>
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">
              So what can Yielder do?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-center">
              A quick peek at the stuff that makes it easier to Stake and keep
              track of your liquidity.
            </p>
          </div>
          <div className="w-full">
            <FeaturesSectionWithHoverEffects />
          </div>
        </div>
      </section>
      <TeamSection />
      <footer className="mt-auto border-t py-6 px-6">
        <div className="max-w-6xl mx-auto flex justify-end">
          <a
            href="https://github.com/aashu1412/yielder"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-ring hover:text-ring/50 transition-colors"
          >
            <Github className="size-4" />
            <span>Check the Repo</span>
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
