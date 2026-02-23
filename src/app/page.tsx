import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookOpen, MapPin, Clock, Users, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-20 md:py-32">
        <div className="container px-4 text-center mx-auto">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex justify-center">
              <BookOpen className="h-16 w-16 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              The Missing Chapter
            </h1>
            <p className="text-xl text-muted-foreground md:text-2xl">
              Valencia English Book Exchange
            </p>
            <p className="mx-auto max-w-xl text-muted-foreground">
              A community-run book exchange in the heart of Mestalla.
              Browse, borrow, and share English books with fellow readers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button asChild size="lg">
                <Link href="/catalog">
                  Browse Catalog
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">Member Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Info cards */}
      <section className="py-16 md:py-24">
        <div className="container px-4 mx-auto">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center text-center space-y-3 p-6">
              <div className="rounded-full bg-primary/10 p-4">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Location</h3>
              <p className="text-sm text-muted-foreground">
                Mestalla neighborhood, Valencia, Spain
              </p>
            </div>

            <div className="flex flex-col items-center text-center space-y-3 p-6">
              <div className="rounded-full bg-primary/10 p-4">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Hours</h3>
              <p className="text-sm text-muted-foreground">
                Check with us for current availability
              </p>
            </div>

            <div className="flex flex-col items-center text-center space-y-3 p-6">
              <div className="rounded-full bg-primary/10 p-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Community</h3>
              <p className="text-sm text-muted-foreground">
                Join our growing community of English-language readers
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t bg-muted/30 py-16 md:py-24">
        <div className="container px-4 mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
            <div className="space-y-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold">
                1
              </div>
              <h3 className="font-semibold">Donate a Book</h3>
              <p className="text-sm text-muted-foreground">
                Bring in an English book to donate and earn credits for borrowing.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold">
                2
              </div>
              <h3 className="font-semibold">Scan &amp; Borrow</h3>
              <p className="text-sm text-muted-foreground">
                Scan the QR code inside any available book to check it out instantly.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold">
                3
              </div>
              <h3 className="font-semibold">Return &amp; Repeat</h3>
              <p className="text-sm text-muted-foreground">
                Return within 3 weeks and pick your next great read.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
