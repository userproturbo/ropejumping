"use client";

import { useEffect, useRef } from "react";

import { api } from "@/trpc/react";

type PostViewTrackerProps = {
  postId: string;
};

const anonymousViewerIdStorageKey = "ropejumping.anonymousViewerId";

const createAnonymousViewerId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getAnonymousViewerId = () => {
  try {
    const existingId = localStorage.getItem(anonymousViewerIdStorageKey);

    if (existingId && existingId.length >= 16 && existingId.length <= 120) {
      return existingId;
    }

    const newId = createAnonymousViewerId();
    localStorage.setItem(anonymousViewerIdStorageKey, newId);

    return newId;
  } catch {
    return createAnonymousViewerId();
  }
};

export function PostViewTracker({ postId }: PostViewTrackerProps) {
  const trackedRef = useRef(false);
  const trackView = api.post.trackView.useMutation();

  useEffect(() => {
    if (trackedRef.current) return;

    trackedRef.current = true;

    try {
      trackView.mutate({
        postId,
        anonymousViewerId: getAnonymousViewerId(),
      });
    } catch {
      // View tracking is best effort and should not affect reading the post.
    }
  }, [postId, trackView]);

  return null;
}
