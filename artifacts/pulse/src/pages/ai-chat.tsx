import React, { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Send, Sparkles, User, Loader2, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout";
import { useData } from "@/lib/data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AIChat() {
  const { chatMessages, sendChatMessage, isAiTyping, sources } = useData();
  const [input, setInput] = useState("");
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isAiTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isAiTyping) return;
    sendChatMessage(input);
    setInput("");
  };

  // Simple formatter to make bold text work for dummy data
  const formatContent = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <Layout>
      <div className="flex flex-col h-full max-w-4xl mx-auto w-full relative">
        <header className="px-6 py-5 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Pulse AI</h1>
            <p className="text-xs font-medium text-muted-foreground">Search and synthesize your library</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 pb-32">
          <AnimatePresence initial={false}>
            {chatMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 max-w-3xl ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                <div className="shrink-0 mt-1">
                  {msg.role === "user" ? (
                    <Avatar className="w-8 h-8 border border-border">
                      <AvatarFallback className="bg-muted text-foreground"><User className="w-4 h-4"/></AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-sm">
                      <Sparkles className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
                
                <div className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div 
                    className={`px-5 py-3.5 rounded-2xl whitespace-pre-wrap text-base leading-relaxed ${
                      msg.role === "user" 
                        ? "bg-foreground text-background rounded-tr-sm" 
                        : "bg-muted/40 border border-border/50 text-foreground/90 rounded-tl-sm shadow-sm"
                    }`}
                  >
                    {formatContent(msg.content)}
                  </div>
                  
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {msg.citations.map((cite, idx) => (
                        <Link key={idx} href={`/source/${cite.sourceId}`}>
                          <a className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/30 transition-all shadow-sm hover:shadow group">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors"/>
                            {cite.text}
                            <ArrowUpRight className="w-3 h-3 ml-0.5 opacity-50 group-hover:opacity-100" />
                          </a>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            
            {isAiTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4 max-w-3xl mr-auto"
              >
                <div className="shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  </div>
                </div>
                <div className="px-5 py-3.5 rounded-2xl rounded-tl-sm bg-muted/30 border border-border/30 text-muted-foreground text-sm font-medium flex items-center gap-2">
                  Searching your library...
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={endOfMessagesRef} className="h-4" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-background via-background to-transparent pt-12">
          <form 
            onSubmit={handleSubmit}
            className="max-w-3xl mx-auto relative flex items-center shadow-lg rounded-2xl bg-card border border-border/80 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all"
          >
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your library..."
              className="border-0 shadow-none bg-transparent h-14 pl-5 pr-14 text-base focus-visible:ring-0 placeholder:text-muted-foreground"
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={!input.trim() || isAiTyping}
              className="absolute right-2 h-10 w-10 rounded-xl transition-transform active:scale-95"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </Button>
          </form>
          <p className="text-center text-xs font-medium text-muted-foreground mt-3">
            Pulse AI synthesizes answers using only your synced content.
          </p>
        </div>
      </div>
    </Layout>
  );
}
