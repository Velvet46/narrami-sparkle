import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewStatusBadge, SuspendedBadge, ScheduleEditor, type AdminStory } from "./shared";
import { listStoriesAdmin as listAllStories, scheduleStoryVisibility as scheduleStory, setStoryHoliday as updateHolidayTag } from "@/lib/admin-stories.functions";

export function HolidayPanel() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tagDraft, setTagDraft] = useState("");

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["walt", "all-stories", "seasonal"],
    queryFn: () => listAllStories({ data: { storyType: "seasonal" } }),
  });

  const grouped = useMemo(() => {
    const map = new Map<string, AdminStory[]>();
    for (const story of stories as AdminStory[]) {
      const key = story.holiday_tag || "Senza festività";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(story);
    }
    return Array.from(map.entries());
  }, [stories]);

  async function handleSaveTag(id: string) {
    await updateHolidayTag({ data: { id, holidayTag: tagDraft || null } });
    setEditingId(null);
    await queryClient.invalidateQueries({ queryKey: ["walt", "all-stories"] });
  }

  async function handleSchedule(story: AdminStory, from: string | null, to: string | null) {
    await scheduleStory({ data: { id: story.id, visibleFrom: from, visibleTo: to } });
    await queryClient.invalidateQueries({ queryKey: ["walt", "all-stories"] });
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Carico...</p>;

  return (
    <div className="space-y-8">
      {grouped.length === 0 && <p className="text-sm text-muted-foreground">Nessuna fiaba stagionale ancora.</p>}
      {grouped.map(([holiday, items]) => (
        <div key={holiday} className="space-y-3">
          <h3 className="text-lg font-semibold">{holiday}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((story) => (
              <Card key={story.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{story.title}</CardTitle>
                  <div className="flex gap-2">
                    <ReviewStatusBadge status={story.status} />
                    <SuspendedBadge active={story.active} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ScheduleEditor
                    visibleFrom={story.visible_from}
                    visibleTo={story.visible_to}
                    onChange={(from, to) => handleSchedule(story, from, to)}
                  />
                  {editingId === story.id ? (
                    <div className="flex gap-2">
                      <Input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} className="h-8" placeholder="es. pasqua" />
                      <Button size="sm" onClick={() => handleSaveTag(story.id)}>Salva</Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setEditingId(story.id); setTagDraft(story.holiday_tag || ""); }}
                    >
                      Cambia festività
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
