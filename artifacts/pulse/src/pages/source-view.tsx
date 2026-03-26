import React, { useMemo } from "react";
import { useParams } from "wouter";
import { format } from "date-fns";
import { Layout, SourceIcon } from "@/components/layout";
import { useData } from "@/lib/data";
import { ContentCard } from "@/components/content-card";
import { Badge } from "@/components/ui/badge";

export default function SourceView() {
  const { sourceId } = useParams();
  const { sources = [], contentItems = [] } = useData();

  const source = sources.find(s => s.id === sourceId);
  
  const items = useMemo(() => {
    return contentItems
      .filter(item => item.sourceId === sourceId)
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  }, [contentItems, sourceId]);

  if (!source) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-display font-bold text-foreground">Source not found</h1>
        </div>
      </Layout>
    );
  }

  const typeColorMap = {
    youtube: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50",
    podcast: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900/50",
    newsletter: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50",
    blog: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/50"
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8 md:px-8 md:py-12">
        <header className="mb-10 bg-card p-6 md:p-8 rounded-3xl border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline" className={`capitalize px-3 py-1 font-medium ${typeColorMap[source.type]}`}>
                <SourceIcon type={source.type} className="w-3.5 h-3.5 mr-1.5" />
                {source.type}
              </Badge>
              {source.status === "paused" && (
                <Badge variant="secondary" className="bg-muted text-muted-foreground">Paused</Badge>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">{source.name}</h1>
            <a 
              href={`https://${source.url}`} 
              target="_blank" 
              rel="noreferrer"
              className="text-primary hover:underline mt-2 inline-block font-medium text-sm"
            >
              {source.url}
            </a>
          </div>
          
          <div className="flex flex-col items-start md:items-end">
            <span className="text-3xl font-display font-bold text-foreground">{items.length}</span>
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Indexed Items</span>
          </div>
        </header>

        <div className="space-y-6">
          {items.map(item => (
            <ContentCard key={item.id} item={item} />
          ))}

          {items.length === 0 && (
            <div className="text-center py-20 bg-muted/20 rounded-2xl border border-border border-dashed">
              <p className="text-muted-foreground">No content synced from this source yet.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
