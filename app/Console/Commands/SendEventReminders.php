<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\PostEvent;
use App\Models\SystemNotification;
use Illuminate\Support\Facades\Http;
use Carbon\Carbon;

class SendEventReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'events:send-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send automatic notifications for events exactly 3 days away or happening today';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $upcomingEvents = PostEvent::where('status', 'Upcoming')->get();
        $today = Carbon::today();

        foreach ($upcomingEvents as $event) {
            $eventDate = Carbon::parse($event->event_date)->startOfDay();
            $daysDiff = $today->diffInDays($eventDate, false); // false means negative if past

            if ($daysDiff === 3) {
                $this->sendNotification($event, 'event_reminder_3days', "Reminder: 3 days until {$event->title}");
            } elseif ($daysDiff === 0) {
                $this->sendNotification($event, 'event_reminder_today', "Today: {$event->title}");
            }
        }
    }

    private function sendNotification($event, $type, $title)
    {
        // Check if notification already exists for this event and type to prevent duplicates
        $exists = SystemNotification::where('related_id', $event->id)
            ->where('type', $type)
            ->exists();

        if (!$exists) {
            SystemNotification::create([
                'title' => $title,
                'message' => "The event '{$event->title}' is scheduled for " . Carbon::parse($event->event_date)->format('M d, Y') . " at " . ($event->start_time ? date('h:i A', strtotime($event->start_time)) : 'TBA') . ". Location: " . ($event->location ?: 'TBA'),
                'type' => $type,
                'target' => 'all', // Send to everyone since Admin, Staff1, Staff2 all need it
                'related_id' => $event->id
            ]);

            // Trigger socket event
            try {
                Http::post('http://127.0.0.1:3000/api/new-notification');
                $this->info("Notification sent for event: {$event->title} ($type)");
            } catch (\Exception $e) {
                $this->error("Failed to trigger socket event for event: {$event->title} - " . $e->getMessage());
            }
        }
    }
}
