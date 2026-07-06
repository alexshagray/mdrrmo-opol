<?php

namespace App\Http\Controllers;

use App\Models\PatientCareReport;
use App\Models\User;
use App\Models\IncidentReport;
use App\Models\IncidentLocation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class PatientCareReportController extends Controller
{
    public function index(Request $request)
    {
        $query = PatientCareReport::with('user', 'patient')->latest();
        
        if ($request->has('search') && !empty($request->search)) {
            $searchTerms = explode(' ', $request->search);
            $query->where(function ($q) use ($searchTerms) {
                foreach ($searchTerms as $term) {
                    $term = trim($term);
                    if ($term !== '') {
                        $q->where(function ($subQ) use ($term) {
                            $subQ->whereHas('patient', function ($q2) use ($term) {
                                $q2->where('first_name', 'LIKE', '%' . $term . '%')
                                   ->orWhere('last_name', 'LIKE', '%' . $term . '%')
                                   ->orWhere('middle_name', 'LIKE', '%' . $term . '%');
                            })->orWhere('pcr_data', 'LIKE', '%' . $term . '%');
                        });
                    }
                }
            });
        }
        
        $reports = $query->paginate(10);
        return response()->json($reports);
    }

    public function store(Request $request)
    {
        try {
            $data = $request->all();
            $incidentId = 'INC-PCR-' . rand(1000, 9999);

            // Find or create Patient User
            $patientFullName = $data['full_name'] ?? 'Unknown Patient';
            $patientParts = explode(' ', $patientFullName, 2);
            $patientAge = $data['pcr_data']['step1']['patientAge'] ?? null;
            $patientGender = $data['pcr_data']['step1']['patientGender'] ?? null;
            $patientContact = $data['contact_number'] ?? null;

            $patientUser = null;
            if ($patientContact) {
                $patientUser = User::firstOrCreate(
                    ['phone_number' => $patientContact],
                    [
                        'first_name' => $patientParts[0],
                        'last_name' => $patientParts[1] ?? '',
                        'role' => 'resident',
                        'address' => $data['address'] ?? null,
                        'age' => $patientAge ? (int)$patientAge : null,
                        'gender' => $patientGender,
                        'password' => bcrypt(uniqid()),
                    ]
                );
            } else {
                // Create user without phone
                $patientUser = User::create([
                    'first_name' => $patientParts[0],
                    'last_name' => $patientParts[1] ?? '',
                    'phone_number' => 'NO-PHONE-' . uniqid(),
                    'role' => 'resident',
                    'address' => $data['address'] ?? null,
                    'age' => $patientAge ? (int)$patientAge : null,
                    'gender' => $patientGender,
                    'password' => bcrypt(uniqid()),
                ]);
            }

            // Create Incident First
            $incident = IncidentReport::create([
                'user_id' => $patientUser->id,
                'incident_id' => $incidentId,
                'emergency_type' => $data['emergency_type'] ?? 'Not specified',
                'status' => 'completed',
                'report_date' => now(),
            ]);

            IncidentLocation::create([
                'incident_report_id' => $incident->id,
                'location' => $data['address'] ?? 'Not specified',
                'latitude' => $data['latitude'] ?? null,
                'longitude' => $data['longitude'] ?? null,
            ]);

            // Create Patient Care Report (Strict Normalization)
            $pcr = PatientCareReport::create([
                'user_id' => null, // Would be auth()->id() if responder logged in
                'patient_id' => $patientUser->id,
                'incident_id' => $incidentId,
                'status' => 'completed',
                'pcr_data' => $data['pcr_data'] ?? null,
                'report_date' => now(),
            ]);

            // Notify Socket server to update the map
            try {
                Http::timeout(3)->post('http://localhost:3000/api/incident-location-update', [
                    'incidentId' => $incident->id,
                    'latitude' => $data['latitude'] ?? null,
                    'longitude' => $data['longitude'] ?? null,
                    'callerName' => $patientUser ? $patientUser->first_name : 'Unknown',
                    'callerNumber' => $patientUser ? $patientUser->phone_number : 'Unknown',
                    'emergencyType' => $incident->emergency_type,
                    'status' => $incident->status,
                ]);
            } catch (\Exception $e) {}

            return response()->json([
                'success' => true,
                'message' => 'Patient Care Report saved in database successfully',
                'incident_id' => $incidentId
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to save report: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $report = PatientCareReport::find($id);
        if ($report) {
            $report->update($request->all());
            return response()->json([
                'success' => true,
                'message' => 'Patient Care Report updated successfully',
                'report' => $report
            ]);
        }
        return response()->json([
            'success' => false,
            'message' => 'Report not found'
        ], 404);
    }

    public function destroy($id)
    {
        $report = PatientCareReport::find($id);
        if ($report) {
            $report->delete();
            return response()->json([
                'success' => true,
                'message' => 'Patient Care Report #' . $id . ' deleted successfully'
            ]);
        }
        return response()->json([
            'success' => false,
            'message' => 'Report not found'
        ], 404);
    }
}
