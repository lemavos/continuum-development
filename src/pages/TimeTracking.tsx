// This file has been removed - time tracking is now integrated into entities
import { useState } from 'react';
import AppLayout from "@/components/AppLayout";
import { TimeTrackingList } from "@/components/TimeTrackingList";
import { TimeAnalyticsCalendar } from "@/components/TimeAnalyticsCalendar";
import { DayDetailsModal } from "@/components/DayDetailsModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DayData {
  date: Date;
  totalSeconds: number;
  entries: Array<{
    id: string;
    entityId: string;
    entityTitle?: string;
    durationSeconds: number;
    note?: string;
  }>;
}

/**
 * Time Tracking Overview - Lists all projects with timer controls
 */
export default function TimeTracking() {
  const [selectedDayData, setSelectedDayData] = useState<DayData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDayClick = (dayData: DayData) => {
    setSelectedDayData(dayData);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDayData(null);
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-display font-semibold text-white">
            Tracking
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Track time spent on your projects and habits
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <TimeTrackingList />
          </TabsContent>

          <TabsContent value="analytics">
            <TimeAnalyticsCalendar onDayClick={handleDayClick} />
          </TabsContent>
        </Tabs>

        <DayDetailsModal
          dayData={selectedDayData}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      </div>
    </AppLayout>
  );
}
