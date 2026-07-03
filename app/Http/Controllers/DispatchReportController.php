<?php

namespace App\Http\Controllers;

use App\Models\DispatchReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class DispatchReportController extends Controller
{
    public function index()
    {
        $reports = DispatchReport::with('responder')->latest()->get();
        return response()->json($reports);
    }

    public function store(Request $request)
    {
        $request->validate([
            'responder_id' => 'required|exists:users,id',
            'incident_id' => 'nullable|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'status_note' => 'nullable|string',
        ]);

        $dispatchReport = DispatchReport::create([
            'responder_id' => $request->responder_id,
            'incident_id' => $request->incident_id,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'status_note' => $request->status_note,
        ]);

        $dispatchReport->load('responder');

        // Notify socket server
        try {
            Http::timeout(3)->post('http://localhost:3000/api/dispatch-report', [
                'dispatchReport' => $dispatchReport
            ]);
        } catch (\Exception $e) {
            // Ignore socket failure
        }

        return response()->json([
            'success' => true,
            'data' => $dispatchReport,
            'message' => 'Dispatch report created successfully'
        ], 201);
    }
}
