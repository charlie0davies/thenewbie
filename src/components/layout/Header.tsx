import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
}

export default function Header({ title, subtitle, right, className }: HeaderProps) {
  return (
    <header className={cn("flex items-center justify-between px-4 pt-12 pb-4", className)}>
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {right && <div>{right}</div>}
    </header>
  );
}
