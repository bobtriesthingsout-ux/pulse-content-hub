import React, { createContext, useContext, useState, useEffect } from "react";

export type SourceType = "youtube" | "podcast" | "newsletter" | "blog";

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  url: string;
  status: "active" | "paused";
}

export interface ContentItem {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceType: SourceType;
  title: string;
  publishedAt: Date;
  url: string;
  tldr: string | null;
  takeaways: string[];
  type: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  citations?: { sourceId: string; text: string }[];
}

interface DataContextType {
  sources: Source[];
  contentItems: ContentItem[];
  readStates: Record<string, boolean>;
  isLoading: boolean;
  toggleReadState: (date: string) => void;
  toggleSourceStatus: (id: string) => void;
  addSource: (source: Omit<Source, "id" | "status"> & { externalId: string }) => void;
  chatMessages: ChatMessage[];
  sendChatMessage: (content: string) => void;
  isAiTyping: boolean;
  refetchSources: () => void;
}

const DataContext = createContext<DataContextType | null>(null);

const API_BASE = "/api";

function normalizeItem(raw: any): ContentItem {
  return {
    id: raw.id,
    sourceId: raw.sourceId,
    sourceName: raw.sourceName ?? "",
    sourceType: raw.sourceType ?? "blog",
    title: raw.title,
    publishedAt: new Date(raw.publishedAt),
    url: raw.originalUrl ?? raw.url ?? "#",
    tldr: raw.summaryTldr ?? raw.tldr ?? null,
    takeaways: Array.isArray(raw.takeaways) ? raw.takeaways : [],
    type: raw.type,
  };
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [sources, setSources] = useState<Source[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [readStates, setReadStates] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);

  const fetchSources = async () => {
    const res = await fetch(`${API_BASE}/sources`);
    const data = await res.json();
    setSources(data);
  };

  const fetchContent = async () => {
    const res = await fetch(`${API_BASE}/content`);
    const data = await res.json();
    setContentItems(data.map(normalizeItem));
  };

  const fetchReadStates = async () => {
    const res = await fetch(`${API_BASE}/content/read-status`);
    const data = await res.json();
    setReadStates(data);
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchSources(), fetchContent(), fetchReadStates()]);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const toggleReadState = async (date: string) => {
    const newVal = !readStates[date];
    setReadStates(prev => ({ ...prev, [date]: newVal }));
    await fetch(`${API_BASE}/content/read-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, isRead: newVal }),
    });
  };

  const toggleSourceStatus = async (id: string) => {
    const source = sources.find(s => s.id === id);
    if (!source) return;
    const newStatus = source.status === "active" ? "paused" : "active";
    setSources(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
    await fetch(`${API_BASE}/sources/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  const addSource = async (source: Omit<Source, "id" | "status"> & { externalId: string }) => {
    const res = await fetch(`${API_BASE}/sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(source),
    });
    if (res.ok) {
      await fetchSources();
    }
  };

  const sendChatMessage = async (content: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };
    setChatMessages(prev => [...prev, userMsg]);
    setIsAiTyping(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });
      const data = await res.json();
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "ai",
        content: data.content ?? "Sorry, I couldn't generate a response.",
        citations: data.citations ?? [],
      };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "ai",
        content: "Something went wrong — please try again.",
      };
      setChatMessages(prev => [...prev, aiMsg]);
    } finally {
      setIsAiTyping(false);
    }
  };

  return (
    <DataContext.Provider value={{
      sources,
      contentItems,
      readStates,
      isLoading,
      toggleReadState,
      toggleSourceStatus,
      addSource,
      chatMessages,
      sendChatMessage,
      isAiTyping,
      refetchSources: fetchSources,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within a DataProvider");
  return context;
}