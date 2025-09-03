import { cn } from "@/lib/utils";
import {
  IconArrowsShuffle,
  IconCoin,
  IconChartLine,
  IconLock,
  IconGauge,
  IconDatabase,
  IconTrendingUp,
  IconWallet,
} from "@tabler/icons-react";

export function FeaturesSectionWithHoverEffects() {
  const features = [
    {
      title: "Swap without stress",
      description:
        "Pick a token, hit swap, and Yielder finds the best deal across all the DEXs for you.",
      icon: <IconArrowsShuffle />,
    },
    {
      title: "One wallet, all DEXs",
      description:
        "No more jumping between sites. Manage everything in one place.",
      icon: <IconWallet />,
    },
    {
      title: "Better prices, deeper pools",
      description:
        "We pull liquidity from everywhere so trades just feel smoother.",
      icon: <IconDatabase />,
    },
    {
      title: "Track with MCP",
      description:
        "See how your pools are doing in real time without opening five tabs.",
      icon: <IconChartLine />,
    },
    {
      title: "Smarter staking",
      description:
        "Tell us your tokens, we’ll suggest the pool that makes the most sense.",
      icon: <IconTrendingUp />,
    },
    {
      title: "Know your risks",
      description:
        "Each pool comes with a simple vibe check - chill, balanced, or spicy.",
      icon: <IconGauge />,
    },
    {
      title: "Easy in, easy out",
      description:
        "Add or pull out liquidity in a few clicks. No calculator math needed.",
      icon: <IconCoin />,
    },
    {
      title: "Safe and steady",
      description:
        "Runs on AO, so it’s built to last. Your funds, your control.",
      icon: <IconLock />,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 relative z-10 py-10 max-w-7xl mx-auto">
      {features.map((feature, index) => (
        <Feature key={feature.title} {...feature} index={index} />
      ))}
    </div>
  );
}

const Feature = ({
  title,
  description,
  icon,
  index,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col lg:border-r py-10 relative group/feature border-border",
        (index === 0 || index === 4) && "lg:border-l border-border",
        index < 4 && "lg:border-b border-border",
      )}
    >
      {index < 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-primary/10 dark:from-primary/20 to-transparent pointer-events-none" />
      )}
      {index >= 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-primary/10 dark:from-primary/20 to-transparent pointer-events-none" />
      )}
      <div className="mb-4 relative z-10 px-10 text-muted-foreground group-hover/feature:text-primary transition-colors duration-200">
        {icon}
      </div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-muted group-hover/feature:bg-primary transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-foreground">
          {title}
        </span>
      </div>
      <p className="text-sm text-muted-foreground max-w-xs relative z-10 px-10">
        {description}
      </p>
    </div>
  );
};
