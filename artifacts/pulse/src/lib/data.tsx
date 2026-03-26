import React, { createContext, useContext, useState, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { subDays, format } from "date-fns";

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
  title: string;
  publishedAt: Date;
  url: string;
  tldr: string;
  takeaways: string[];
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
  readStates: Record<string, boolean>; // date string -> is_read
  toggleReadState: (date: string) => void;
  toggleSourceStatus: (id: string) => void;
  addSource: (source: Omit<Source, "id" | "status">) => void;
  chatMessages: ChatMessage[];
  sendChatMessage: (content: string) => void;
  isAiTyping: boolean;
}

const DataContext = createContext<DataContextType | null>(null);

// -- Dummy Data Generation --

const DUMMY_SOURCES: Source[] = [
  { id: "s1", name: "Lex Fridman", type: "youtube", status: "active", url: "youtube.com/@lexfridman" },
  { id: "s2", name: "Y Combinator", type: "youtube", status: "active", url: "youtube.com/@ycombinator" },
  { id: "s3", name: "Andrej Karpathy", type: "youtube", status: "active", url: "youtube.com/@AndrejKarpathy" },
  { id: "s4", name: "Two Minute Papers", type: "youtube", status: "paused", url: "youtube.com/@TwoMinutePapers" },
  { id: "s5", name: "The Tim Ferriss Show", type: "podcast", status: "active", url: "tim.blog/podcast" },
  { id: "s6", name: "Acquired", type: "podcast", status: "active", url: "acquired.fm" },
  { id: "s7", name: "Huberman Lab", type: "podcast", status: "active", url: "hubermanlab.com" },
  { id: "s8", name: "All-In Podcast", type: "podcast", status: "paused", url: "allinpodcast.co" },
  { id: "s9", name: "The Pragmatic Engineer", type: "newsletter", status: "active", url: "blog.pragmaticengineer.com" },
  { id: "s10", name: "Morning Brew", type: "newsletter", status: "active", url: "morningbrew.com" },
  { id: "s11", name: "TLDR Newsletter", type: "newsletter", status: "active", url: "tldr.tech" },
  { id: "s12", name: "Paul Graham Essays", type: "blog", status: "active", url: "paulgraham.com" },
  { id: "s13", name: "Stratechery", type: "blog", status: "active", url: "stratechery.com" },
  { id: "s14", name: "Wait But Why", type: "blog", status: "paused", url: "waitbutwhy.com" },
];

const today = new Date();

const DUMMY_CONTENT: ContentItem[] = [
  {
    id: "c1",
    sourceId: "s1",
    title: "Sam Altman: OpenAI, AGI, and the Future of Humanity",
    publishedAt: today,
    url: "#",
    tldr: "Sam Altman discusses the timeline for AGI, the internal culture at OpenAI, and the societal implications of profound AI advancements.",
    takeaways: [
      "AGI timeline predictions are narrowing, with OpenAI focusing intensely on alignment and safety mechanisms.",
      "The compute constraint remains the largest bottleneck for training the next generation of frontier models.",
      "Societal adaptation to AI will happen gradually, minimizing the 'shock' factor often depicted in sci-fi.",
      "Open source models play a critical role, but frontier capabilities may remain closed due to safety risks."
    ]
  },
  {
    id: "c2",
    sourceId: "s9",
    title: "The Shift in Engineering Org Structures for 2026",
    publishedAt: today,
    url: "#",
    tldr: "An analysis of how top tech companies are flattening engineering management layers and empowering individual contributors with AI tools.",
    takeaways: [
      "The ratio of managers to ICs has increased from 1:6 to 1:12 across major tech hubs.",
      "AI coding assistants have boosted median developer productivity by approximately 35%.",
      "Senior ICs are increasingly expected to take on product management and architectural responsibilities.",
      "Performance reviews are shifting from measuring output volume to business impact and architecture simplicity."
    ]
  },
  {
    id: "c3",
    sourceId: "s5",
    title: "Morning Routines, Deep Work, and Mastering Sleep",
    publishedAt: subDays(today, 1),
    url: "#",
    tldr: "Tim Ferriss shares strategies for optimizing morning routines to guarantee deep work, drawing from recent interviews with neuroscientists.",
    takeaways: [
      "Delaying caffeine intake by 90-120 minutes after waking prevents the afternoon crash.",
      "Engaging in 90-minute 'deep work' blocks with zero notifications leads to exponentially higher quality output.",
      "Viewing natural sunlight within 30 minutes of waking regulates the circadian rhythm effectively."
    ]
  },
  {
    id: "c4",
    sourceId: "s12",
    title: "Startups in the Age of Ubiquitous Intelligence",
    publishedAt: subDays(today, 1),
    url: "#",
    tldr: "Paul Graham argues that the definition of a startup hasn't changed, but the speed at which ideas can be validated has accelerated dramatically.",
    takeaways: [
      "The cost of building an MVP is trending toward zero, shifting the bottleneck to distribution and taste.",
      "Founders should focus on solving niche, unsexy problems that large models can't address off-the-shelf.",
      "Agility and direct user communication remain the ultimate moats for small teams."
    ]
  },
  {
    id: "c5",
    sourceId: "s2",
    title: "Y Combinator W26 Batch Announcement & Trends",
    publishedAt: subDays(today, 2),
    url: "#",
    tldr: "YC announces its latest batch, highlighting a massive surge in applied AI across traditional industries like manufacturing and law.",
    takeaways: [
      "Over 60% of the new batch integrates LLMs into their core product offering.",
      "Hardware and defense tech startups saw a 20% increase in representation.",
      "Solo founders are succeeding at higher rates due to the leverage provided by AI developer tools."
    ]
  },
  {
    id: "c6",
    sourceId: "s6",
    title: "The History and Strategy of NVIDIA",
    publishedAt: subDays(today, 2),
    url: "#",
    tldr: "A deep dive into NVIDIA's pivot from gaming GPUs to dominating the AI compute market through CUDA and hardware bets.",
    takeaways: [
      "Jensen Huang's 2006 bet on CUDA created an insurmountable software moat that competitors are still struggling to breach.",
      "NVIDIA's ability to supply full data center architectures, not just chips, redefined their market position.",
      "The gaming segment, while historically vital, now serves primarily as a scale testing ground for enterprise architectures."
    ]
  }
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "m1",
    role: "user",
    content: "What have I learned about AI this week?"
  },
  {
    id: "m2",
    role: "ai",
    content: "Based on your content from the past week, there are a few major themes regarding AI:\n\n**1. Accelerated AGI Timelines & Safety:** Sam Altman noted that predictions for AGI are narrowing, with OpenAI focusing heavily on safety mechanisms and managing the compute bottleneck. \n\n**2. Shifts in Engineering:** The Pragmatic Engineer discussed how AI coding tools have boosted developer productivity by ~35%, leading to flatter engineering organizations where ICs take on more architectural duties.\n\n**3. Startup Economics:** Paul Graham argued that while building MVPs now costs near zero, the real challenge has shifted to distribution and having good product taste.",
    citations: [
      { sourceId: "s1", text: "Sam Altman: OpenAI, AGI..." },
      { sourceId: "s9", text: "The Shift in Engineering Org..." },
      { sourceId: "s12", text: "Startups in the Age of..." }
    ]
  },
  {
    id: "m3",
    role: "user",
    content: "Summarize the key themes from Tim Ferriss recently."
  },
  {
    id: "m4",
    role: "ai",
    content: "Tim Ferriss recently focused heavily on biological optimization for deep work. The primary takeaways are:\n\n- **Caffeine Timing**: Delay caffeine for 90-120 minutes after waking to avoid afternoon crashes.\n- **Deep Work Blocks**: Use strict 90-minute zero-interruption blocks for maximum output.\n- **Circadian Rhythms**: View morning sunlight within 30 minutes of waking.",
    citations: [
      { sourceId: "s5", text: "Morning Routines, Deep Work..." }
    ]
  }
];

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [sources, setSources] = useState<Source[]>(DUMMY_SOURCES);
  const [contentItems] = useState<ContentItem[]>(DUMMY_CONTENT);
  const [readStates, setReadStates] = useState<Record<string, boolean>>({});
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [isAiTyping, setIsAiTyping] = useState(false);

  const toggleReadState = (date: string) => {
    setReadStates(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const toggleSourceStatus = (id: string) => {
    setSources(prev => prev.map(s => 
      s.id === id ? { ...s, status: s.status === "active" ? "paused" : "active" } : s
    ));
  };

  const addSource = (source: Omit<Source, "id" | "status">) => {
    const newSource: Source = {
      ...source,
      id: uuidv4(),
      status: "active",
    };
    setSources(prev => [...prev, newSource]);
  };

  const sendChatMessage = (content: string) => {
    const userMsg: ChatMessage = { id: uuidv4(), role: "user", content };
    setChatMessages(prev => [...prev, userMsg]);
    setIsAiTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: uuidv4(),
        role: "ai",
        content: "This is a simulated AI response. In the full version, I would retrieve semantic matches from your database and synthesize an answer based on your recent podcasts, newsletters, and videos.",
        citations: [
          { sourceId: sources[0].id, text: sources[0].name }
        ]
      };
      setChatMessages(prev => [...prev, aiMsg]);
      setIsAiTyping(false);
    }, 1500);
  };

  const value = {
    sources,
    contentItems,
    readStates,
    toggleReadState,
    toggleSourceStatus,
    addSource,
    chatMessages,
    sendChatMessage,
    isAiTyping
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within a DataProvider");
  return context;
}
