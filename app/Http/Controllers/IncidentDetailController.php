<?php

namespace App\Http\Controllers;

use App\Models\IncidentDetail;
use App\Models\IncidentLocation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class IncidentDetailController extends Controller
{
    public function index(Request $request)
    {
        $query = IncidentDetail::with(['user', 'location', 'emergencyType'])->latest();
        
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        
        $incidents = $query->paginate(10);
        return response()->json($incidents);
    }

    public function mapIncidents()
    {
        $incidents = IncidentDetail::with(['user', 'location'])
            ->whereNotIn('status', ['rejected', 'cancelled', 'declined'])
            ->latest()
            ->get();
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
        // Automatically save new emergency types to the database so they appear in dropdowns later
        $emergencyType = \App\Models\EmergencyType::firstOrCreate(
            ['emergency_name' => $typeString],
            ['description' => 'Custom emergency type added from mobile app']
        );
        $typeId = $emergencyType->id;

        $incident = IncidentDetail::create([
            'user_id' => $user ? $user->id : null,
            'incident_id' => 'INC-' . rand(10000, 99999),
            'emergency_type_id' => $typeId,
            'status' => 'active',
            'report_date' => now(),
        ]);

        $barangayId = $request->input('barangay_id');
        if (!$barangayId && $request->input('barangay')) {
            $b = \App\Models\Barangay::where('barangay_name', $request->input('barangay'))->first();
            if ($b) $barangayId = $b->id;
        }

        IncidentLocation::create([
            'incident_detail_id' => $incident->id,
            'latitude' => $request->input('latitude'),
            'longitude' => $request->input('longitude'),
            'barangay_id' => $barangayId,
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
        $incident = IncidentDetail::find($id);
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
        \Illuminate\Support\Facades\Schema::disableForeignKeyConstraints();
        IncidentDetail::truncate();
        \Illuminate\Support\Facades\Schema::enableForeignKeyConstraints();
        
        return response()->json([
            'success' => true,
            'message' => 'All Incident Reports deleted successfully'
        ]);
    }

    public function updateCallerName(Request $request, $id)
    {
        $incident = IncidentDetail::with('user')->find($id);
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

    public function updateStatus(Request $request, $id)
    {
        $incident = IncidentDetail::find($id);
        if (!$incident) {
            return response()->json(['success' => false, 'message' => 'Incident not found'], 404);
        }

        $request->validate([
            'status' => 'required|string'
        ]);

        $incident->update([
            'status' => strtolower($request->status)
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Incident status updated successfully to ' . $request->status,
            'incident' => $incident
        ]);
    }

    public function updateLocation(Request $request, $id)
    {
        $incident = IncidentDetail::find($id);
        if (!$incident || !$incident->location) {
            return response()->json(['success' => false, 'message' => 'Incident or location not found'], 404);
        }

        $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric'
        ]);

        $incident->location->update([
            'latitude' => $request->latitude,
            'longitude' => $request->longitude
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Incident location updated successfully'
        ]);
    }
}
