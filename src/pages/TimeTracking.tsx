// This file has been removed - time tracking is now integrated into entities
import AppLayout from "@/components/AppLayout";
import { TimeTrackingList } from "@/components/TimeTrackingList";

export default function TimeTracking() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-display font-semibold text-white">
            Tracking
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Track your projects and activities
          </p>
        </div>

        <TimeTrackingList />
      </div>
    </AppLayout>
  );
}
