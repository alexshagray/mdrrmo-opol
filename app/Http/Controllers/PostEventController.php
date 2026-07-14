<?php

namespace App\Http\Controllers;

use App\Models\PostEvent;
// use App\Models\SystemNotification;
use Illuminate\Http\Request;

class PostEventController extends Controller
{
    public function index()
    {
        return response()->json(PostEvent::with('creator')->orderBy('event_date', 'asc')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'event_type' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'event_date' => 'required|date',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i',
            'status' => 'sometimes|string',
        ]);

        $validated['user_id'] = auth()->id() ?? 1; // Fallback to System Admin if not fully authed via API

        $event = PostEvent::create($validated);

        try {
            \Illuminate\Support\Facades\Http::timeout(3)->post('http://localhost:3000/api/new-notification', []);
        } catch (\Exception $e) {
            // Ignore if node server is down
        }

        return response()->json($event, 201);
    }

    public function show($id)
    {
        return response()->json(PostEvent::findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $event = PostEvent::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'event_type' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'event_date' => 'sometimes|required|date',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i',
            'status' => 'sometimes|string',
        ]);

        $event->update($validated);
        return response()->json($event);
    }

    public function destroy($id)
    {
        $event = PostEvent::findOrFail($id);
        $event->delete();
        return response()->json(null, 204);
    }
}
