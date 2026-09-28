type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return <article className={`glass-card rounded-2xl ${className}`.trim()}>{children}</article>;
}
