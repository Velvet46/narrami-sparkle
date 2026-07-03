import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PendingReviewPanel } from "./pending-review-panel";
import { AllStoriesPanel } from "./all-stories-panel";
import { HolidayPanel } from "./holiday-panel";

export function WaltDashboard() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Walt</h1>
        <p className="text-sm text-muted-foreground">Gestione fiabe: revisione, catalogo e programmazione stagionale.</p>
      </div>
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Da revisionare</TabsTrigger>
          <TabsTrigger value="all">Tutte le fiabe</TabsTrigger>
          <TabsTrigger value="holiday">Festività</TabsTrigger>
        </TabsList>
        <TabsContent value="pending"><PendingReviewPanel /></TabsContent>
        <TabsContent value="all"><AllStoriesPanel /></TabsContent>
        <TabsContent value="holiday"><HolidayPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

export default WaltDashboard;
