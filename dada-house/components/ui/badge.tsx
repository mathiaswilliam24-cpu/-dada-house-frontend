import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[#F7921A]/10 border-[#F7921A]/30 text-[#F7921A]",
        pending: "bg-yellow-50 border-yellow-200 text-yellow-700",
        confirmed: "bg-blue-50 border-blue-200 text-blue-700",
        in_progress: "bg-orange-50 border-orange-200 text-orange-700",
        completed: "bg-green-50 border-green-200 text-green-700",
        cancelled: "bg-red-50 border-red-200 text-red-700",
        navy: "bg-[#1B3FA8] border-[#1A3490] text-blue-200",
        outline: "border-[#1A3490] text-blue-300 bg-transparent",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
