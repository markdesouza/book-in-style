"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  CalendarPlus,
  CheckCheck,
  MoveRight,
  PencilLine,
  XCircle,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { NewsEvent } from "@/db/schema";
import { markAllNewsSeen, markNewsSeen } from "@/app/actions";

const META: Record<
  NewsEvent["type"],
  { icon: typeof Bell; label: string; className: string }
> = {
  new: { icon: CalendarPlus, label: "New booking", className: "text-emerald-600" },
  change_requested: {
    icon: PencilLine,
    label: "Change requested",
    className: "text-blue-600",
  },
  moved: { icon: MoveRight, label: "Rescheduled", className: "text-amber-600" },
  cancelled: { icon: XCircle, label: "Cancelled", className: "text-rose-600" },
};

export function NewsFeed({
  news,
  open,
  onOpenChange,
  unseen,
}: {
  news: NewsEvent[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  unseen: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const refresh = () => router.refresh();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <Button
        variant="outline"
        size="icon"
        className="relative"
        onClick={() => onOpenChange(true)}
      >
        <Bell className="size-4" />
        {unseen > 0 && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
            {unseen > 9 ? "9+" : unseen}
          </span>
        )}
        <span className="sr-only">News feed</span>
      </Button>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-sm">
        <SheetHeader className="border-b">
          <SheetTitle>News feed</SheetTitle>
          <SheetDescription>
            {unseen > 0 ? `${unseen} unread update${unseen > 1 ? "s" : ""}` : "All caught up"}
          </SheetDescription>
        </SheetHeader>

        {unseen > 0 && (
          <div className="border-b p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() =>
                startTransition(async () => {
                  await markAllNewsSeen();
                  refresh();
                })
              }
            >
              <CheckCheck className="size-4" />
              Mark all as read
            </Button>
          </div>
        )}

        <ScrollArea className="flex-1">
          <ul className="divide-y">
            {news.length === 0 && (
              <li className="p-6 text-center text-sm text-muted-foreground">
                Nothing here yet.
              </li>
            )}
            {news.map((n) => {
              const meta = META[n.type];
              const Icon = meta.icon;
              return (
                <li
                  key={n.id}
                  className={cn(
                    "flex gap-3 p-3 text-sm",
                    !n.seen && "bg-primary/5",
                  )}
                >
                  <Icon className={cn("mt-0.5 size-4 shrink-0", meta.className)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {meta.label}
                      </span>
                      {!n.seen && (
                        <button
                          className="text-xs text-primary hover:underline"
                          onClick={() =>
                            startTransition(async () => {
                              await markNewsSeen(n.id);
                              refresh();
                            })
                          }
                        >
                          Mark seen
                        </button>
                      )}
                    </div>
                    <p className={cn(!n.seen && "font-medium")}>{n.message}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
