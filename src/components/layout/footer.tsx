import { BookOpen } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="container px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Valencia English Book Exchange
            </span>
          </div>
          <div className="text-center text-sm text-muted-foreground">
            <p>Mestalla, Valencia, Spain</p>
            <p className="mt-1">A community-run English book exchange</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
