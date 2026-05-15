-- CreateTable
CREATE TABLE "EventGalleryImage" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventGalleryImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObjectGalleryImage" (
    "id" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObjectGalleryImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventGalleryImage_eventId_idx" ON "EventGalleryImage"("eventId");

-- CreateIndex
CREATE INDEX "EventGalleryImage_mediaId_idx" ON "EventGalleryImage"("mediaId");

-- CreateIndex
CREATE INDEX "EventGalleryImage_eventId_sortOrder_idx" ON "EventGalleryImage"("eventId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "EventGalleryImage_eventId_mediaId_key" ON "EventGalleryImage"("eventId", "mediaId");

-- CreateIndex
CREATE INDEX "ObjectGalleryImage_objectId_idx" ON "ObjectGalleryImage"("objectId");

-- CreateIndex
CREATE INDEX "ObjectGalleryImage_mediaId_idx" ON "ObjectGalleryImage"("mediaId");

-- CreateIndex
CREATE INDEX "ObjectGalleryImage_objectId_sortOrder_idx" ON "ObjectGalleryImage"("objectId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ObjectGalleryImage_objectId_mediaId_key" ON "ObjectGalleryImage"("objectId", "mediaId");

-- AddForeignKey
ALTER TABLE "EventGalleryImage" ADD CONSTRAINT "EventGalleryImage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventGalleryImage" ADD CONSTRAINT "EventGalleryImage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectGalleryImage" ADD CONSTRAINT "ObjectGalleryImage_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "JumpObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectGalleryImage" ADD CONSTRAINT "ObjectGalleryImage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
