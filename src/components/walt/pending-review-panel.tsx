import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ReviewStatusBadge, type AdminStory } from "./shared";
import { listPendingReview as listPendingStories, searchAndProposeClassicStory as generateWaltStories, approveStory, rejectStory } from "@/lib/admin-stories.functions";

export function PendingReviewPanel() {
  const queryClient = useQueryClient();
  const [topic, setTopic] = useState("");
  const [age, setAge] = useState<"3-5" | "6-8" | "9-12">("6-8");
  const [holidayTag, setHolidayTag] = useState("");
  const [searching, setSearching] = useState(false);

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ["walt", "pending-stories"],
    queryFn: () => listPendingStories(),
  });

  async function handleSearch() {
    setSearching(true);
    try {
      await generateWaltStories({ data: { topic: topic || undefined, age, holidayTag: holidayTag || undefined, count: 3 } });
      await queryClient.invalidateQueries({ queryKey: ["walt", "pending-stories"] });
      setTopic("");
      setHolidayTag("");
    } finally {
      setSearching(false);
    }
  }

  async function handleApprove(id: string) {
    await approveStory({ data: { id } });
    await queryClient.invalidateQueries({ queryKey: ["walt", "pending-stories"] });
    await queryClient.invalidateQueries({ queryKey: ["walt", "all-stories"] });
  }

  async function handleReject(id: string) {
    await rejectStory({ data: { id } });
    await queryClient.invalidateQueries({ queryKey: ["walt", "pending-stories"] });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cerca nuove fiabe</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Argomento (opzionale)</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="es. amicizia nel bosco" className="w-64" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Età</Label>
            <Select value={age} onValueChange={(v) => setAge(v as typeof age)}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="3-5">3-5</SelectItem>
                <SelectItem value="6-8">6-8</SelectItem>
                <SelectItem value="9-12">9-12</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Festività (opzionale)</Label>
            <Input value={holidayTag} onChange={(e) => setHolidayTag(e.target.value)} placeholder="es. natale" className="w-40" />
          </div>
          <Button onClick={handleSearch} disabled={searching}>
            {searching ? "Genero..." : "Cerca nuove fiabe"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">Carico...</p>}
        {!isLoading && pending.length === 0 && (
          <p className="text-sm text-muted-foreground">Nessuna fiaba in attesa di revisione.</p>
        )}
        {pending.map((story: AdminStory) => (
          <Card key={story.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">{story.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{story.subtitle}</p>
              </div>
              <ReviewStatusBadge status={story.status} />
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea readOnly value={story.content} className="min-h-40 text-sm" />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Età {story.age}</span>
                <span>·</span>
                <span>{story.mode}</span>
                {story.holiday_tag && (
                  <>
                    <span>·</span>
                    <span>{story.holiday_tag}</span>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleApprove(story.id)}>Approva</Button>
                <Button size="sm" variant="destructive" onClick={() => handleReject(story.id)}>Rifiuta</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
