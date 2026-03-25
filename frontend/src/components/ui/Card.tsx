import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({ children, className, hover = false, padding = "md" }: CardProps) {
  const paddings = {
    none: "",
    sm: "p-4",
    md: "p-5",
    lg: "p-6",
  };

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-slate-100 shadow-sm",
        hover && "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer",
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
