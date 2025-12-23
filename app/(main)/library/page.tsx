import prisma from "@/lib/prisma";
import { getUser } from "@/actions/user";
import { redirect } from "next/navigation";

type ImageItem = {
  id: string;
  url: string;
  alt: string;
  createdAt: Date;
};

function extractImagesFromParts(
  parts: any[] | null | undefined,
  createdAt: Date
): ImageItem[] {
  if (!Array.isArray(parts)) return [];

  const images: ImageItem[] = [];

  for (const part of parts) {
    if (!part || typeof part !== "object") continue;

    const type = (part as any).type;
    const mediaType = (part as any).mediaType || "";
    const url = (part as any).url as string | undefined;
    const name =
      (part as any).name || (part as any).filename || "Image attachment";

    const isFileLike = type === "file" || type === "attachment";
    const isImage =
      typeof mediaType === "string" && mediaType.startsWith("image/");

    if (isFileLike && isImage && url) {
      images.push({
        id: (part as any).id || `${url}-${createdAt.toISOString()}`,
        url,
        alt: name,
        createdAt,
      });
    }
  }

  return images;
}

export default async function LibraryPage() {
  const user = await getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const messages = await prisma.message.findMany({
    where: {
      chat: {
        userId: user.id,
      },
    },
    select: {
      id: true,
      parts: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const allImages: ImageItem[] = [];

  for (const message of messages) {
    const parts = message.parts as any[] | null | undefined;
    const images = extractImagesFromParts(parts, message.createdAt);
    allImages.push(...images);
  }

  // De-duplicate by URL + createdAt to avoid repeats if any
  const seen = new Set<string>();
  const uniqueImages = allImages.filter((img) => {
    const key = `${img.url}-${img.createdAt.toISOString()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <main className="flex min-h-screen flex-1 flex-col px-4 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Image Library
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            All images you&apos;ve ever attached or generated in your chats,
            collected in one place.
          </p>
        </header>

        {uniqueImages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed bg-muted/40 p-10 text-center">
            <div className="max-w-md space-y-2">
              <p className="text-base font-medium">No images yet</p>
              <p className="text-sm text-muted-foreground">
                Start a chat and attach or generate images. They&apos;ll appear
                here automatically.
              </p>
            </div>
          </div>
        ) : (
          <section aria-label="Image library" className="w-full">
            <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
              {uniqueImages.map((image) => (
                <figure
                  key={image.id}
                  className="mb-4 break-inside-avoid overflow-hidden rounded-xl border bg-background shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <img
                    src={image.url}
                    alt={image.alt}
                    className="h-auto w-full object-cover"
                    loading="lazy"
                  />
                  <figcaption className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground">
                    <span className="line-clamp-1">{image.alt}</span>
                    <span className="ml-2 shrink-0">
                      {image.createdAt.toLocaleDateString()}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
