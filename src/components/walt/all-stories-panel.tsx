import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReviewStatusBadge, SuspendedBadge, ScheduleEditor, type AdminStory } from "./shared";
import { listStoriesAdmin as listAllStories, setStorySuspended, scheduleStoryVisibility as scheduleStory } from "@/lib/admin-stories.functions";

const ALL = "all";

export function AllStoriesPanel() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<string>(ALL);
  const [age, setAge] = useState<string>(ALL);
  const [storyType, setStoryType] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["walt", "all-stories", mode, age, storyType, status],
    queryFn: () =>
      listAllStories({
        data: {
          mode: mode === ALL ? undefined : mode,
          age: age === ALL ? undefined : (age as "3-5" | "6-8" | "9-12"),
          storyType: storyType === ALL ? undefined : (storyType as AdminStory["story_type"]),
          status: status === ALL ? undefined : (status as AdminStory["status"]),
        },
      }),
  });

  async function handleToggleActive(story: AdminStory) {
    await setStorySuspended({ data: { id: story.id, suspended: story.active } });
    await queryClient.invalidateQueries({ queryKey: ["walt", "all-stories"] });
  }

  async function handleSchedule(story: AdminStory, from: string | null, to: string | null) {
    await scheduleStory({ data: { id: story.id, visibleFrom: from, visibleTo: to } });
    await queryClient.invalidateQueries({ queryKey: ["walt", "all-stories"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Genere" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tutti i generi</SelectItem>
            <SelectItem value="nanna">Nanna</SelectItem>
            <SelectItem value="avventura">Avventura</SelectItem>
            <SelectItem value="magica">Magica</SelectItem>
            <SelectItem value="educativa">Educativa</SelectItem>
            <SelectItem value="divertente">Divertente</SelectItem>
            <SelectItem value="sportiva">Sportiva</SelectItem>
          </SelectContent>
        </Select>
        <Select value={age} onValueChange={setAge}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Età" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tutte le età</SelectItem>
            <SelectItem value="3-5">3-5</SelectItem>
            <SelectItem value="6-8">6-8</SelectItem>
            <SelectItem value="9-12">9-12</SelectItem>
          </SelectContent>
        </Select>
        <Select value={storyType} onValueChange={setStoryType}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tutti i tipi</SelectItem>
            <SelectItem value="catalog">Catalogo</SelectItem>
            <SelectItem value="seasonal">Stagionale</SelectItem>
            <SelectItem value="user">Utente</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Stato" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tutti gli stati</SelectItem>
            <SelectItem value="draft">Bozza</SelectItem>
            <SelectItem value="pending">In revisione</SelectItem>
            <SelectItem value="approved">Approvata</SelectItem>
            <SelectItem value="rejected">Rifiutata</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titolo</TableHead>
            <TableHead>Genere</TableHead>
            <TableHead>Età</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead>Attiva</TableHead>
            <TableHead>Programmazione</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow><TableCell colSpan={8} className="text-sm text-muted-foreground">Carico...</TableCell></TableRow>
          )}
          {!isLoading && stories.length === 0 && (
            <TableRow><TableCell colSpan={8} className="text-sm text-muted-foreground">Nessuna fiaba trovata.</TableCell></TableRow>
          )}
          {stories.map((story: AdminStory) => (
            <TableRow key={story.id}>
              <TableCell className="font-medium">{story.title}</TableCell>
              <TableCell>{story.mode}</TableCell>
              <TableCell>{story.age}</TableCell>
              <TableCell>{story.story_type}</TableCell>
              <TableCell><ReviewStatusBadge status={story.status} /></TableCell>
              <TableCell><SuspendedBadge active={story.active} /></TableCell>
              <TableCell>
                <ScheduleEditor
                  visibleFrom={story.visible_from}
                  visibleTo={story.visible_to}
                  onChange={(from, to) => handleSchedule(story, from, to)}
                />
              </TableCell>
              <TableCell>
                <Button size="sm" variant={story.active ? "outline" : "default"} onClick={() => handleToggleActive(story)}>
                  {story.active ? "Sospendi" : "Riattiva"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
