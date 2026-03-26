import React, { useState } from "react";
import { Layout, SourceIcon } from "@/components/layout";
import { useData, SourceType } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Plus, Link as LinkIcon, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ManageSources() {
  const { sources = [], toggleSourceStatus, addSource } = useData();
  const { toast } = useToast();
  
  const [newType, setNewType] = useState<SourceType>("youtube");
  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl || !newName) {
      toast({
        title: "Missing fields",
        description: "Please provide a name and URL for the source.",
        variant: "destructive",
      });
      return;
    }

    addSource({ name: newName, type: newType, url: newUrl });
    
    toast({
      title: "Source added successfully",
      description: `${newName} will be synced in the next polling cycle.`,
    });
    
    setNewUrl("");
    setNewName("");
  };

  const typeColorMap = {
    youtube: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50",
    podcast: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900/50",
    newsletter: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50",
    blog: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/50"
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8 md:px-8 md:py-12">
        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground flex items-center gap-3">
            <Database className="w-8 h-8 text-primary" />
            Manage Sources
          </h1>
          <p className="text-muted-foreground mt-3 text-lg">Configure the feeds and channels Pulse monitors for you.</p>
        </header>

        <section className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sources.map(source => {
              const isActive = source.status === "active";
              return (
                <Card 
                  key={source.id} 
                  className={`p-5 bg-card transition-all duration-300 border-border shadow-sm flex flex-col justify-between h-40 ${!isActive ? 'opacity-70 bg-muted/30 grayscale-[0.2]' : 'hover:shadow-md hover:border-primary/30'}`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="font-display font-bold text-lg leading-tight truncate text-foreground">
                      {source.name}
                    </h3>
                    <Switch 
                      checked={isActive} 
                      onCheckedChange={() => toggleSourceStatus(source.id)} 
                      className="data-[state=checked]:bg-primary shrink-0"
                    />
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground truncate font-medium mb-3">{source.url}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={`capitalize px-2.5 py-0.5 font-medium ${typeColorMap[source.type]}`}>
                        <SourceIcon type={source.type} className="w-3.5 h-3.5 mr-1.5" />
                        {source.type}
                      </Badge>
                      <Badge variant="secondary" className={`font-semibold tracking-wide uppercase text-[10px] ${isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {isActive ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="max-w-2xl bg-card rounded-3xl p-6 md:p-8 border border-border shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          
          <h2 className="text-2xl font-display font-bold text-foreground mb-6 flex items-center gap-2 relative z-10">
            <Plus className="w-6 h-6 text-primary" />
            Add New Source
          </h2>
          
          <form onSubmit={handleAddSource} className="space-y-5 relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="space-y-2 sm:col-span-1">
                <label className="text-sm font-semibold text-foreground uppercase tracking-wide">Source Type</label>
                <Select value={newType} onValueChange={(v) => setNewType(v as SourceType)}>
                  <SelectTrigger className="h-12 bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="podcast">Podcast</SelectItem>
                    <SelectItem value="newsletter">Newsletter</SelectItem>
                    <SelectItem value="blog">Blog / Substack</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-semibold text-foreground uppercase tracking-wide">Display Name</label>
                <Input 
                  placeholder="e.g. Lex Fridman" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-12 bg-background border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground uppercase tracking-wide">URL or Identifier</label>
              <div className="relative">
                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="https://..." 
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="h-12 pl-11 bg-background border-border"
                />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full h-12 text-base font-bold shadow-md hover:shadow-lg transition-all">
              Add Source
            </Button>
          </form>
        </section>
      </div>
    </Layout>
  );
}
