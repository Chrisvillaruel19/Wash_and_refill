"use client";

import { useEffect, useState } from "react";

export interface ServerPageResult<T> {
  items: T[];
  totalPages: number;
}

// Genuine server-driven pagination — each page turn issues a fresh request
// via `fetchPage`, unlike usePagination.ts (which slices an already-fully-
// loaded array in memory). `fetchPage` must be a stable reference (e.g. the
// API service function itself, not an inline closure) since it's an effect
// dependency; if it needs to vary per-call, wrap it in useCallback at the
// call site.
//
// `enabled` lets a caller toggle this off (e.g. while a client-side
// filter/search is active and the page has fallen back to a full fetch +
// usePagination instead) without unmounting the hook.
export function useServerPage<T>(
  fetchPage: (page: number, pageSize: number) => Promise<ServerPageResult<T>>,
  pageSize: number,
  enabled: boolean,
  // Bump this (e.g. a counter) after a mutation that could change which
  // records exist on the current page (a create/submit) to force a refetch
  // of the same page — changing `page` itself wouldn't refetch if the user
  // is already on page 1.
  reloadKey: number | string = 0
) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<T[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError("");
    fetchPage(page, pageSize)
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setTotalPages(result.totalPages);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Unable to load this page. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, page, pageSize, fetchPage, reloadKey]);

  return { page, setPage, totalPages, items, loading, error };
}
