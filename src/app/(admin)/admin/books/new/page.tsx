"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBookAction } from "@/actions/books";
import { GENRES, CONDITIONS, BOOK_STATUSES } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save, ImageIcon, Upload, Loader2, X } from "lucide-react";
import { fetchOpenLibraryCover } from "@/lib/covers";
import { uploadBookCover } from "@/lib/storage";

export default function AddBookPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [fetchingCover, setFetchingCover] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    authorLast: "",
    authorFirst: "",
    author2Last: "",
    author2First: "",
    genre: "",
    isYA: false,
    condition: "",
    status: "Available",
    donorId: "",
    donorName: "",
    donationDate: "",
    notes: "",
  });

  function updateField(field: string, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleFetchCover() {
    if (!formData.title || !formData.authorLast) {
      toast.error("Enter a title and author last name first.");
      return;
    }
    setFetchingCover(true);
    try {
      const author = [formData.authorFirst, formData.authorLast].filter(Boolean).join(" ");
      const url = await fetchOpenLibraryCover(formData.title, author);
      if (url) {
        setCoverPreview(url);
        setCoverFile(null);
        toast.success("Cover found!");
      } else {
        toast.error("No cover found on Open Library.");
      }
    } catch {
      toast.error("Failed to fetch cover.");
    } finally {
      setFetchingCover(false);
    }
  }

  function handleCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.title || !formData.authorLast || !formData.authorFirst || !formData.genre || !formData.condition || !formData.status) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      // Determine cover URL: upload file or use fetched URL
      let coverUrl: string | null = coverPreview;
      if (coverFile) {
        // We need a temporary ID; create book first then update, or use timestamp
        const tempId = `temp-${Date.now()}`;
        coverUrl = await uploadBookCover(tempId, coverFile);
      }

      const result = await createBookAction({
        title: formData.title,
        authorLast: formData.authorLast,
        authorFirst: formData.authorFirst,
        author2Last: formData.author2Last || null,
        author2First: formData.author2First || null,
        genre: formData.genre,
        isYA: formData.isYA,
        condition: formData.condition,
        status: formData.status,
        donorId: formData.donorId || null,
        donorName: formData.donorName || null,
        donationDate: formData.donationDate || null,
        coverUrl,
        notes: formData.notes || "",
      });

      if (result.success) {
        toast.success("Book added successfully!");
        router.push("/admin/books");
      }
    } catch (error) {
      console.error("Error creating book:", error);
      toast.error("Failed to add book. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Link href="/admin/books">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Books
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Add New Book</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Book title"
                required
              />
            </div>

            {/* Primary Author */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="authorLast">Author Last Name *</Label>
                <Input
                  id="authorLast"
                  value={formData.authorLast}
                  onChange={(e) => updateField("authorLast", e.target.value)}
                  placeholder="Last name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="authorFirst">Author First Name *</Label>
                <Input
                  id="authorFirst"
                  value={formData.authorFirst}
                  onChange={(e) => updateField("authorFirst", e.target.value)}
                  placeholder="First name"
                  required
                />
              </div>
            </div>

            {/* Second Author */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="author2Last">Second Author Last Name</Label>
                <Input
                  id="author2Last"
                  value={formData.author2Last}
                  onChange={(e) => updateField("author2Last", e.target.value)}
                  placeholder="Last name (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="author2First">Second Author First Name</Label>
                <Input
                  id="author2First"
                  value={formData.author2First}
                  onChange={(e) => updateField("author2First", e.target.value)}
                  placeholder="First name (optional)"
                />
              </div>
            </div>

            {/* Genre */}
            <div className="space-y-2">
              <Label htmlFor="genre">Genre *</Label>
              <Select value={formData.genre} onValueChange={(val) => updateField("genre", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent>
                  {GENRES.map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Young Adult Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isYA"
                checked={formData.isYA}
                onCheckedChange={(checked) => updateField("isYA", checked === true)}
              />
              <Label htmlFor="isYA">Young Adult (YA)</Label>
            </div>

            {/* Condition */}
            <div className="space-y-2">
              <Label htmlFor="condition">Condition *</Label>
              <Select value={formData.condition} onValueChange={(val) => updateField("condition", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((condition) => (
                    <SelectItem key={condition} value={condition}>
                      {condition}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(val) => updateField("status", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {BOOK_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Donor Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="donorId">Donor ID</Label>
                <Input
                  id="donorId"
                  value={formData.donorId}
                  onChange={(e) => updateField("donorId", e.target.value)}
                  placeholder="Donor ID (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="donorName">Donor Name</Label>
                <Input
                  id="donorName"
                  value={formData.donorName}
                  onChange={(e) => updateField("donorName", e.target.value)}
                  placeholder="Donor name (optional)"
                />
              </div>
            </div>

            {/* Donation Date */}
            <div className="space-y-2">
              <Label htmlFor="donationDate">Donation Date</Label>
              <Input
                id="donationDate"
                type="date"
                value={formData.donationDate}
                onChange={(e) => updateField("donationDate", e.target.value)}
              />
            </div>

            {/* Cover Photo */}
            <div className="space-y-3">
              <Label>Cover Photo</Label>
              <div className="flex items-start gap-4">
                {coverPreview ? (
                  <div className="relative">
                    <img
                      src={coverPreview}
                      alt="Cover preview"
                      className="h-32 w-auto rounded border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => { setCoverPreview(null); setCoverFile(null); }}
                      className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-32 w-24 items-center justify-center rounded border border-dashed">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleFetchCover}
                    disabled={fetchingCover}
                  >
                    {fetchingCover ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ImageIcon className="h-4 w-4 mr-2" />
                    )}
                    Fetch Cover
                  </Button>
                  <Label
                    htmlFor="coverUpload"
                    className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Image
                  </Label>
                  <input
                    id="coverUpload"
                    type="file"
                    accept="image/*"
                    onChange={handleCoverFileChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Additional notes (optional)"
                rows={3}
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-4">
              <Link href="/admin/books">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={submitting}>
                <Save className="h-4 w-4 mr-2" />
                {submitting ? "Adding..." : "Add Book"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
