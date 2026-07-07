<?php

namespace App\Http\Controllers;

use App\Models\IncidentReport;
use App\Models\IncidentLocation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class IncidentReportController extends Controller
{
    public function index(Request $request)
    {
        $query = IncidentReport::with('user')->latest();
        
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        
        $incidents = $query->paginate(10);
        return response()->json($incidents);
    }

    public function mapIncidents()
    {
        $incidents = IncidentReport::with('user')->latest()->get();
        return response()->json($incidents);
    }

    public function store(Request $request)
    {
        $callerNumber = $request->input('caller_number');
        $user = null;
        if ($callerNumber) {
            $user = User::firstOrCreate(
                ['phone_number' => $callerNumber],
                [
                    'first_name' => 'Unknown',
                    'last_name' => 'Caller',
                    'role' => 'resident',
                    'password' => bcrypt(uniqid()),
                ]
            );
            
            // Update name if responder typed something else
            $passedName = $request->input('caller_name');
            if ($passedName && $passedName !== 'Unknown' && $passedName !== 'Unknown Caller' && $passedName !== 'Visitor') {
                $parts = explode(' ', $passedName, 2);
                $user->update([
                    'first_name' => $parts[0],
                    'last_name' => isset($parts[1]) ? $parts[1] : ''
                ]);
            }
        }

        $typeString = $request->input('emergency_type', 'Other');
        $emergencyType = \App\Models\EmergencyType::where('name', 'like', "%{$typeString}%")->first();
        $typeId = $emergencyType ? $emergencyType->id : (\App\Models\EmergencyType::where('name', 'Other')->value('id') ?? 1);

        $incident = IncidentReport::create([
            'user_id' => $user ? $user->id : null,
            'incident_id' => 'INC-' . rand(10000, 99999),
            'emergency_type_id' => $typeId,
            'status' => 'active',
            'report_date' => now(),
        ]);

        IncidentLocation::create([
            'incident_report_id' => $incident->id,
            'latitude' => $request->input('latitude'),
            'longitude' => $request->input('longitude'),
            'barangay' => $request->input('barangay'),
            'purok' => $request->input('purok'),
            'landmark' => $request->input('landmark'),
            'location' => trim($request->input('purok') . ' ' . $request->input('barangay') . ' ' . $request->input('landmark')),
        ]);

        try {
            Http::timeout(3)->post('http://localhost:3000/api/incident-location-update', [
                'incidentId' => $incident->id,
                'latitude' => $incident->latitude,
                'longitude' => $incident->longitude,
                'callerName' => $user ? $user->first_name : 'Unknown',
                'callerNumber' => $user ? $user->phone_number : 'Unknown',
                'emergencyType' => $incident->emergencyType ? $incident->emergencyType->name : 'Other',
                'status' => $incident->status,
            ]);
        } catch (\Exception $e) {}

        return response()->json([
            'success' => true,
            'message' => 'Incident logged in backend database',
            'incident_id' => $incident->id
        ]);
    }

    public function destroy($id)
    {
        $incident = IncidentReport::find($id);
        if ($incident) {
            $incident->forceDelete();
            return response()->json([
                'success' => true,
                'message' => 'Incident Report #' . $id . ' permanently deleted'
            ]);
        }
        return response()->json([
            'success' => false,
            'message' => 'Incident Report not found'
        ], 404);
    }

    public function destroyAll()
    {
        IncidentReport::truncate();
        return response()->json([
            'success' => true,
            'message' => 'All Incident Reports deleted successfully'
        ]);
    }

    public function updateCallerName(Request $request, $id)
    {
        $incident = IncidentReport::with('user')->find($id);
        if (!$incident || !$incident->user) {
            return response()->json(['success' => false, 'message' => 'Incident or Caller not found'], 404);
        }

        $fullName = $request->input('caller_name');
        if ($fullName) {
            $parts = explode(' ', $fullName, 2);
            $incident->user->update([
                'first_name' => $parts[0],
                'last_name' => isset($parts[1]) ? $parts[1] : ''
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Caller name updated successfully!'
        ]);
    }
}
