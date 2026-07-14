<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\PostEvent;
use Illuminate\Support\Facades\File;
use Carbon\Carbon;

class NotificationController extends Controller
{
    public function index()
    {
        $notifications = [];

        // 1. New Events created in the last 3 days
        $newEvents = PostEvent::where('created_at', '>=', Carbon::now()->subDays(3))->get();
        foreach ($newEvents as $event) {
            $notifications[] = [
                'id' => 'event_new_' . $event->id,
                'title' => 'New Event Scheduled',
                'message' => "A new event '{$event->title}' has been scheduled for " . Carbon::parse($event->event_date)->format('M d, Y') . ".",
                'type' => 'event_new',
                'created_at' => $event->created_at->toIso8601String(),
                'payload' => $event
            ];
        }

        // 2. Events happening exactly 3 days from today
        $threeDaysFromNow = Carbon::now()->addDays(3)->toDateString();
        $upcomingEvents = PostEvent::whereDate('event_date', '=', $threeDaysFromNow)->get();
        foreach ($upcomingEvents as $event) {
            $notifications[] = [
                'id' => 'event_rem_3d_' . $event->id,
                'title' => 'Upcoming Event Reminder',
                'message' => "Reminder: The event '{$event->title}' is happening in exactly 3 days on " . Carbon::parse($event->event_date)->format('M d, Y') . ".",
                'type' => 'event_upcoming',
                'created_at' => Carbon::now()->toIso8601String(), // We use now because it's a generated reminder
                'payload' => $event
            ];
        }

        // 3. Events happening today
        $today = Carbon::now()->toDateString();
        $todayEvents = PostEvent::whereDate('event_date', '=', $today)->get();
        foreach ($todayEvents as $event) {
            $notifications[] = [
                'id' => 'event_rem_0d_' . $event->id,
                'title' => 'Event Happening Today!',
                'message' => "Today is the day! The event '{$event->title}' is happening today at {$event->location}.",
                'type' => 'event_today',
                'created_at' => Carbon::now()->toIso8601String(),
                'payload' => $event
            ];
        }

        // 4. Recent Report Submissions (last 3 days)
        $reportsPath = storage_path('app/public/reports');
        if (File::exists($reportsPath)) {
            $files = File::allFiles($reportsPath);
            foreach ($files as $file) {
                $mtime = filemtime($file->getPathname());
                if ($mtime >= Carbon::now()->subDays(3)->timestamp) {
                    $filename = $file->getFilename();
                    $relativePath = $file->getRelativePathname(); // e.g. inventory/Inventory_xxx.pdf
                    $fileType = str_contains(strtolower($filename), 'inventory') ? 'Inventory' : 'Incident';
                    
                    $notifications[] = [
                        'id' => 'report_submission_' . md5($filename),
                        'title' => "$fileType Report Submission",
                        'message' => "A new $fileType report ($filename) was submitted and is ready for review.",
                        'type' => 'report',
                        'created_at' => Carbon::createFromTimestamp($mtime)->toIso8601String(),
                        'payload' => [
                            'filename' => $filename,
                            'url' => asset('storage/reports/' . str_replace('\\', '/', $relativePath))
                        ]
                    ];
                }
            }
        }

        // Sort notifications by created_at descending (newest first)
        usort($notifications, function ($a, $b) {
            return strtotime($b['created_at']) - strtotime($a['created_at']);
        });

        return response()->json($notifications);
    }
}
