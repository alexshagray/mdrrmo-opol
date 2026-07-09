<?php

namespace App\Http\Controllers;

use App\Models\ResponderLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ResponderLogController extends Controller
{
    public function index()
    {
        $logs = ResponderLog::with('responder')->latest()->get();
        return response()->json($logs);
    }

    public function store(Request $request)
    {
        $request->validate([
            'responder_id' => 'required|exists:users,id',
            'incident_id' => 'nullable|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'status' => 'nullable|in:Assigned,Dispatched,En route,Arrived at scene,Rejected',
        ]);

        $responderLog = ResponderLog::create([
            'responder_id' => $request->responder_id,
            'incident_id' => $request->incident_id,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'status' => $request->status,
        ]);

        $responderLog->load('responder');

        // Notify socket server
        try {
            Http::timeout(3)->post('http://localhost:3000/api/responder-log', [
                'responderLog' => $responderLog
            ]);
        } catch (\Exception $e) {
            // Ignore socket failure
        }

        return response()->json([
            'success' => true,
            'data' => $responderLog,
            'message' => 'Responder log created successfully'
        ], 201);
    }
}
