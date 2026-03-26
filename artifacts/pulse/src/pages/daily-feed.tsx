import React, { useMemo } from "react";
import { format } from "date-fns";
import { ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useData } from "@/lib/data";
import { ContentCard } from "@/components/content-card";
import { Layout } from "@/components/layout";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export default function DailyFeed() {
  const { contentItems, sources, readStates, toggleReadState } = useData();

  // Group items by date string
  const groupedByDate = useMemo(() => {
    const groups: Record<string, typeof contentItems> = {};
    contentItems.forEach(item => {
      const dateKey = format(item.publishedAt, "yyyy-MM-dd");
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    });
    
    // Sort dates descending
    return Object.entries(groups).sort((a, b) => 
      new Date(b[0]).getTime() - new Date(a[0]).getTime()
    );
  }, [contentItems]);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8 md:px-8 md:py-12">
        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Daily Feed</h1>
          <p className="text-muted-foreground mt-2 text-lg">Your content synthesis, organized by day.</p>
        </header>

        <div className="space-y-8">
          {groupedByDate.map(([dateKey, items], index) => {
            const dateLabel = format(new Date(dateKey + "T12:00:00Z"), "EEEE, MMMM d, yyyy");
            const isRead = readStates[dateKey] || false;
            
            // Group items within the date by source
            const itemsBySource: Record<string, typeof items> = {};
            items.forEach(item => {
              if (!itemsBySource[item.sourceId]) itemsBySource[item.sourceId] = [];
              itemsBySource[item.sourceId].push(item);
            });

            return (
              <Collapsible 
                key={dateKey} 
                defaultOpen={index === 0} 
                className={`group/date rounded-2xl border border-border bg-card/50 shadow-sm overflow-hidden transition-all duration-300 ${isRead ? 'opacity-70' : ''}`}
              >
                <div className="flex items-center justify-between p-4 md:p-5 bg-card hover:bg-muted/30 transition-colors">
                  <CollapsibleTrigger className="flex items-center gap-3 flex-1 text-left">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-data-[state=open]/date:rotate-180 transition-transform duration-300">
                      <ChevronDown className="w-4 h-4 text-foreground/70" />
                    </div>
                    <h2 className="text-lg md:text-xl font-display font-semibold text-foreground">
                      {dateLabel}
                    </h2>
                    <Badge variant="secondary" className="ml-2 bg-muted text-muted-foreground no-default-active-elevate font-medium">
                      {items.length} {items.length === 1 ? 'item' : 'items'}
                    </Badge>
                  </CollapsibleTrigger>
                  
                  <div className="flex items-center gap-2 pl-4 border-l border-border">
                    <label 
                      className="text-sm font-medium text-muted-foreground cursor-pointer flex items-center gap-2 select-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="hidden sm:inline">{isRead ? "Read" : "Mark as read"}</span>
                      <Checkbox 
                        checked={isRead} 
                        onCheckedChange={() => toggleReadState(dateKey)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </label>
                  </div>
                </div>

                <CollapsibleContent>
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="p-4 md:p-6 border-t border-border space-y-10"
                  >
                    {Object.entries(itemsBySource).map(([sourceId, sourceItems]) => {
                      const source = sources.find(s => s.id === sourceId);
                      return (
                        <div key={sourceId} className="space-y-4">
                          <div className="flex items-center gap-3 mb-4">
                            <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                              {source?.name || "Unknown"}
                            </h3>
                            <div className="flex-1 h-px bg-border/60"></div>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-6">
                            {sourceItems.map(item => (
                              <ContentCard key={item.id} item={item} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {groupedByDate.length === 0 && (
            <div className="text-center py-20 px-4 border-2 border-dashed border-border rounded-2xl">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-display font-semibold text-foreground">You're all caught up</h3>
              <p className="text-muted-foreground mt-2">No new content to display. Check back later.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
