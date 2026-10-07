import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-neutral-200", className)}
      {...props}
    />
  );
}

export function VideoCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-video w-full rounded-2xl" />
      <div className="flex gap-3">
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function RelatedVideoSkeleton() {
  return (
    <div className="flex gap-3">
      <Skeleton className="w-40 aspect-video rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="animate-pulse border-b border-neutral-100">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </td>
      {[...Array(columns - 1)].map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton className="h-4 w-16" />
        </td>
      ))}
    </tr>
  );
}
