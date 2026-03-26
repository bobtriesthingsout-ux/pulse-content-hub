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
  publishedAt: string;
  originalUrl: string;
  tldr: string | null;
  takeaways: string[];
  type: string;
}

export interface DateGroup {
  date: string;
  items: ContentItem[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  citations?: { sourceId: string; text: string }[];
}

interface DataContextType {
  sources: Source[];
  dateGroups: DateGroup[];
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

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [sources, setSources] = useState<Source[]>([]);
  const [dateGroups, setDateGroups] = useState<DateGroup[]>([]);
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
    const res = await fetch(`${API_BASE}/content/by-date`);
    const data = await res.json();
    setDateGroups(data);
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
    // AI chat implementation comes in Session 4
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "ai",
        content: "AI chat is coming soon — your content library is being built. Check back after more sources are ingested!",
      };
      setChatMessages(prev => [...prev, aiMsg]);
      setIsAiTyping(false);
    }, 800);
  };

  const value = {
    sources,
    dateGroups,
    readStates,
    isLoading,
    toggleReadState,
    toggleSourceStatus,
    addSource,
    chatMessages,
    sendChatMessage,
    isAiTyping,
    refetchSources: fetchSources,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within a DataProvider");
  return context;
}