import { FeaturesSectionWithHoverEffects } from "@/components/feature-section-with-hover-effects";
import TeamSection from "@/components/team";
import { Preview as TextRotateDemo } from "@/components/TextRotateDemo";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
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
    </div>
  );
};

export default Landing;
