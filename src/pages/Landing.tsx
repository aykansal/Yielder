import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import permaswapLogo from "@/assets/permaswap.png";
import { ArrowRight, Github, Twitter, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router";

export default function Landing() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    document.title = "Yielder · Decentralized Liquidity Protocol";
  }, []);

  const handleLaunchApp = () => {
    navigate("/pools");
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">Y</span>
            </div>
            <span className="font-semibold">Yielder</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/pools")}>
              Launch App
            </Button>
          </div>
        </div>
      </nav>

      {/* Home Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-20 overflow-hidden">
        <div className="container text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                Unify <span className="text-primary">DEX</span> Liquidity
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
                Aggregate liquidity across multiple DEXs and execute the optimal trading route in one seamless transaction.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <Button
                size="lg"
                onClick={handleLaunchApp}
                className="text-lg px-8 py-6 h-auto"
              >
                Launch App
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </motion.div>

          {/* Microanimation Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="mt-16 relative"
          >
            <NetworkAnimation prefersReducedMotion={prefersReducedMotion} />
          </motion.div>
        </div>
      </section>

      {/* Bento Grid Section */}
      <section className="py-20 px-4">
        <div className="container max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              Why Choose Yielder?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience the future of decentralized trading with our innovative features
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* First Row - 3 equal boxes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="h-64 relative overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Best Stake Finder</h3>
                    <p className="text-muted-foreground">
                      AI-powered pool recommendations that maximize your yield potential
                    </p>
                  </div>
                  <div className="text-primary font-medium">Coming Soon</div>
                </CardContent>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Card className="h-64 relative overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Cross-DEX Trading</h3>
                    <p className="text-muted-foreground">
                      Execute trades across multiple DEXs in a single transaction
                    </p>
                  </div>
                  <div className="text-primary font-medium">Live Now</div>
                </CardContent>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <Card className="h-64 relative overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Real-time Analytics</h3>
                    <p className="text-muted-foreground">
                      Live APR, TVL, and volume data across all integrated protocols
                    </p>
                  </div>
                  <div className="text-primary font-medium">Real-time</div>
                </CardContent>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Card>
            </motion.div>
          </div>

          {/* Second Row - 2/3 and 1/3 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              className="md:col-span-2"
            >
              <Card className="h-64 relative overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Liquidity Management</h3>
                    <p className="text-muted-foreground">
                      Seamless liquidity provision and removal with guided multi-step flows
                    </p>
                  </div>
                  <div className="text-primary font-medium">Advanced</div>
                </CardContent>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              viewport={{ once: true }}
            >
              <Card className="h-64 relative overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Risk Assessment</h3>
                    <p className="text-muted-foreground">
                      Conservative, balanced, and aggressive pool categorization
                    </p>
                  </div>
                  <div className="text-primary font-medium">Smart</div>
                </CardContent>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Meet Our Team</h2>
            <p className="text-xl text-muted-foreground">
              The minds behind Yielder's innovative DEX aggregation platform
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {/* Team Member 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="text-center p-6">
                <CardContent className="space-y-4">
                  <Avatar className="w-24 h-24 mx-auto">
                    <AvatarImage src="/api/placeholder/96/96" alt="Team Member 1" />
                    <AvatarFallback className="text-lg">TM1</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold mb-1">Ayush Verma</h3>
                    <p className="text-muted-foreground mb-4">Founder & Lead Developer</p>
                  </div>
                  <div className="flex justify-center gap-4">
                    <Button variant="ghost" size="sm" asChild>
                      <a href="https://twitter.com/ayushverma" target="_blank" rel="noopener noreferrer">
                        <Twitter className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <a href="https://github.com/ayushverma" target="_blank" rel="noopener noreferrer">
                        <Github className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Team Member 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Card className="text-center p-6">
                <CardContent className="space-y-4">
                  <Avatar className="w-24 h-24 mx-auto">
                    <AvatarImage src="/api/placeholder/96/96" alt="Team Member 2" />
                    <AvatarFallback className="text-lg">TM2</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold mb-1">Co-Founder</h3>
                    <p className="text-muted-foreground mb-4">Product & Strategy</p>
                  </div>
                  <div className="flex justify-center gap-4">
                    <Button variant="ghost" size="sm" asChild>
                      <a href="https://twitter.com/cofounder" target="_blank" rel="noopener noreferrer">
                        <Twitter className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <a href="https://github.com/cofounder" target="_blank" rel="noopener noreferrer">
                        <Github className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container py-16 px-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">Y</span>
              </div>
              <span className="text-2xl font-semibold text-muted-foreground">Yielder</span>
            </div>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              Decentralized Liquidity Protocol - Unifying DEX trading across multiple blockchains
            </p>
            <div className="flex justify-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-foreground transition-colors">Documentation</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Microanimation Component
function NetworkAnimation({ prefersReducedMotion }: { prefersReducedMotion?: boolean }) {
  const [connections, setConnections] = useState<Array<{
    id: number;
    x: number;
    y: number;
    type: 'dex' | 'token';
    label: string;
  }>>([]);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const dexes = [
      { label: 'Permaswap', icon: permaswapLogo },
      { label: 'Botega', icon: '/botega.svg' },
      { label: 'DeXi', icon: '/dexi.svg' },
    ];

    const tokens = [
      { label: 'YT1', symbol: 'YT1' },
      { label: 'YT2', symbol: 'YT2' },
      { label: 'YT3', symbol: 'YT3' },
    ];

    const radius = 200;
    const centerX = 0;
    const centerY = 0;

    const newConnections = [];

    // Add DEX connections
    dexes.forEach((dex, index) => {
      const angle = (index * 120 * Math.PI) / 180;
      newConnections.push({
        id: index,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        type: 'dex' as const,
        label: dex.label,
      });
    });

    // Add token connections
    tokens.forEach((token, index) => {
      const angle = (index * 120 * Math.PI) / 180 + Math.PI;
      newConnections.push({
        id: index + 3,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        type: 'token' as const,
        label: token.label,
      });
    });

    setConnections(newConnections);
  }, [prefersReducedMotion]);

  if (prefersReducedMotion) {
    return (
      <div className="relative w-96 h-96 mx-auto flex items-center justify-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-2xl font-bold text-primary">Y</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-96 h-96 mx-auto">
      {/* Central Logo */}
      <motion.div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center z-10"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <span className="text-2xl font-bold text-primary">Y</span>
      </motion.div>

      {/* Connection Lines */}
      <svg className="absolute inset-0 w-full h-full">
        {connections.map((connection, index) => (
          <motion.line
            key={`line-${connection.id}`}
            x1="50%"
            y1="50%"
            x2={`${50 + (connection.x / 4)}%`}
            y2={`${50 + (connection.y / 4)}%`}
            stroke="currentColor"
            strokeWidth="1"
            className="text-primary/30"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.8 + index * 0.1 }}
          />
        ))}
      </svg>

      {/* Data Flow Animation */}
      {connections.map((connection, index) => (
        <motion.div
          key={`flow-${connection.id}`}
          className="absolute w-2 h-2 rounded-full bg-primary/60"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          animate={{
            x: connection.x * 0.25,
            y: connection.y * 0.25,
          }}
          transition={{
            duration: 3,
            delay: 1.5 + index * 0.2,
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: 2,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Connection Nodes */}
      {connections.map((connection, index) => (
        <motion.div
          key={`node-${connection.id}`}
          className="absolute w-12 h-12 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center shadow-lg"
          style={{
            left: `${50 + (connection.x / 4)}%`,
            top: `${50 + (connection.y / 4)}%`,
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.2 + index * 0.1 }}
        >
          <span className="text-xs font-medium text-primary">
            {connection.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
