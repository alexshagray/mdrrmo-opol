<?php

namespace App\Http\Controllers;

use App\Models\SystemNotification;
use Illuminate\Http\Request;

class SystemNotificationController extends Controller
{
    public function index(Request $request)
    {
        $notifications = SystemNotification::where('created_at', '>=', now()->subDays(7))
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($notifications);
    }

    public function store(Request $request)
    {
        $notification = SystemNotification::create([
            'title' => $request->title,
            'message' => $request->message,
            'type' => $request->type,
        ]);
        try {
            \Illuminate\Support\Facades\Http::timeout(2)->post('http://localhost:3000/api/new-notification');
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Failed to ping socket server for new notification: " . $e->getMessage());
        }
        return response()->json($notification, 201);
    }
}
