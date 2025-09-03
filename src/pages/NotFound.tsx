import { useLocation, useNavigate } from "react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
const nav = useNavigate();

  useEffect(() => {
    console.error("404:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="rounded-[16px] border bg-card p-10 text-center shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
        <h1 className="mb-2 text-4xl font-extrabold">404</h1>
        <p className="mb-6 text-muted-foreground">Bruhh! You hit a Wrong Route!</p>
        <Button className="text-[hsl(var(--primary-700))] underline" onClick={() => nav("/")}>
          Lesss go Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;