import { LayoutGroup, motion } from "motion/react";

import { TextRotate } from "@/components/ui/text-rotate";
import { Github } from "lucide-react";
import { Button } from "./ui/button";

function Preview() {
  return (
    <div className="w-full h-full text-2xl sm:text-3xl md:text-5xl flex flex-col items-center justify-center font-overusedGrotesk bg-white dark:text-muted text-foreground font-light overflow-hidden p-12 sm:p-20 md:p-24 space-y-8">
      <LayoutGroup>
        <motion.div className="flex whitespace-pre text-center" layout>
          <motion.span
            className="pt-0.5 sm:pt-1 md:pt-2"
            layout
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
          >
            Yielder automates{" "}
          </motion.span>
          <TextRotate
            texts={[
              "earnings",
              "yields",
              "💸💸💸",
              "rewards",
              "liquidity",
              "growth",
              "returns",
              "staking",
              "🕶️🕶️🕶️",
            ]}
            mainClassName="text-white px-2 sm:px-2 md:px-3 bg-[#ed7eaa] overflow-hidden py-0.5 sm:py-1 md:py-2 justify-center rounded-lg"
            staggerFrom={"last"}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-120%" }}
            staggerDuration={0.025}
            splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            rotationInterval={2000}
          />
        </motion.div>
      </LayoutGroup>

      <Button
      variant="outline"
        className="mt-6 sm:mt-8 md:mt-10 text-base sm:text-lg md:text-xl px-6 py-3 bg-transparent"
        onClick={() => {
          window.location.href = "/#/pools";
        }}
      >
        Launch App
      </Button>
    </div>
  );
}

export { Preview };
