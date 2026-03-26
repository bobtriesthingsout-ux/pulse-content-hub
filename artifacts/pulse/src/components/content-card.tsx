import React from "react";
import { format } from "date-fns";
import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ContentItem, useData } from "@/lib/data";

export function ContentCard({ item }: { item: ContentItem }) {
  const { sources } = useData();
  const source = sources.find(s => s.id === item.sourceId);

  return (
    <Card className="p-5 md:p-6 bg-card border-border hover:border-primary/20 transition-all duration-300 shadow-sm hover:shadow-md group">
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-start gap-4">
          <h3 className="font-display text-lg md:text-xl font-semibold leading-tight text-foreground group-hover:text-primary transition-colors">
            {item.title}
          </h3>
          <a 
            href={item.url} 
            target="_blank" 
            rel="noreferrer"
            className="shrink-0 text-muted-foreground hover:text-primary transition-colors mt-1"
            title="View original"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
          <span className="truncate">{source?.name || "Unknown Source"}</span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span>{format(item.publishedAt, "MMM d, yyyy")}</span>
        </div>

        <p className="text-foreground/90 mt-1 leading-relaxed">
          {item.tldr}
        </p>

        <div className="mt-3 bg-muted/30 rounded-xl p-4 md:p-5 border border-border/50">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Key Takeaways
          </h4>
          <ul className="space-y-2">
            {item.takeaways.map((takeaway, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-2 shrink-0" />
                <span className="text-sm leading-relaxed text-foreground/80">{takeaway}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
