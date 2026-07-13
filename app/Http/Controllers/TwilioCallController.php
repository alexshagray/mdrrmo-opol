<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Twilio\TwiML\VoiceResponse;
use App\Models\IncidentDetail;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Twilio\Rest\Client;

class TwilioCallController extends Controller
{
    private function getResponderPhoneNumbers()
    {
        // 1. Check if a default/test phone is configured in env
        $envPhone = env('RESPONDER_PHONE');
        if ($envPhone) {
            return [$envPhone];
        }

        // 2. Fetch all approved responders who have a phone number in the database
        $phones = \App\Models\User::where('role', 'responder')
            ->where('approved', true)
            ->whereNotNull('phone')
            ->where('phone', '!=', '')
            ->pluck('phone')
            ->toArray();

        if (!empty($phones)) {
            return $phones;
        }

        // 3. Fallback to default simulation number
        return ['+639500905679'];
    }

    private function getPublicBaseUrl()
    {
        // 1. Try querying local ngrok API
        try {
            $response = Http::timeout(1)->get('http://127.0.0.1:4040/api/tunnels');
            if ($response->successful()) {
                $tunnels = $response->json('tunnels');
                if (!empty($tunnels) && isset($tunnels[0]['public_url'])) {
                    return $tunnels[0]['public_url'];
                }
            }
        } catch (\Exception $e) {
            // fail silently
        }

        // 2. Fall back to APP_URL in .env if configured and not default
        $appUrl = env('APP_URL');
        if ($appUrl && !str_contains($appUrl, 'localhost')) {
            return $appUrl;
        }

        // 3. Fall back to current request host
        return url('/');
    }

    public function handleIncomingCall(Request $request)
    {
        $callerNumber = $request->input('From');
        $callSid = $request->input('CallSid');

        // Check if caller is a resident
        $resident = User::where('phone_number', $callerNumber)->where('role', 'resident')->first();
        $callerType = $resident ? 'Resident' : 'Visitor';

        if (!$resident && $callerNumber) {
            $resident = User::create([
                'first_name' => 'Unknown',
                'last_name' => 'Caller',
                'phone_number' => $callerNumber,
                'role' => 'resident',
                'password' => bcrypt(uniqid())
            ]);
        }

        // Auto-create incident
        $incident = IncidentDetail::create([
            'user_id' => $resident ? $resident->id : null,
            'incident_id' => 'INC-' . strtoupper(uniqid()),

            'caller_type' => $callerType,
            'status' => 'active',
            'report_date' => now(),
        ]);
        
        \App\Models\IncidentLocation::create([
            'incident_detail_id' => $incident->id
        ]);
        
        // Notify Socket.IO Server so the Responder App call screen pops up immediately!
        try {
            Http::timeout(3)->post('http://localhost:3000/api/incoming-call', [
                'phoneNumber' => $callerNumber
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to forward incoming call to socket server: " . $e->getMessage());
        }
        $response = new VoiceResponse();
        
        // Redirect directly to forward call (skip IVR gather)
        $response->redirect(url('/api/twilio/forward-call'), ['method' => 'POST']);

        return response($response)->header('Content-Type', 'text/xml');
    }

    public function handleIvrResponse(Request $request)
    {
        $digits = $request->input('Digits');
        $callerNumber = $request->input('From');
        $incidentId = $request->query('incident_id');
        
        $response = new VoiceResponse();

        if ($digits === '1') {
            // Placeholder for digits handling
        }

        // Forward the call to responder
        $response->redirect(url('/api/twilio/forward-call'), ['method' => 'POST']);

        return response($response)->header('Content-Type', 'text/xml');
    }

    public function forwardCall(Request $request)
    {
        $response = new VoiceResponse();
        
        $dial = $response->dial();
        foreach ($this->getResponderPhoneNumbers() as $phone) {
            // Ensure correct format (add +63 prefix if missing, clean formatting)
            $cleanPhone = str_replace([' ', '-', '(', ')'], '', $phone);
            if (str_starts_with($cleanPhone, '09') && strlen($cleanPhone) == 11) {
                $cleanPhone = '+63' . substr($cleanPhone, 1);
            } elseif (str_starts_with($cleanPhone, '9') && strlen($cleanPhone) == 10) {
                $cleanPhone = '+63' . $cleanPhone;
            }
            $dial->number($cleanPhone);
        }
        
        return response($response)->header('Content-Type', 'text/xml');
    }

    public function checkResident(Request $request)
    {
        $phone = $request->query('phone_number');
        if (!$phone) {
            return response()->json(['isRegistered' => false, 'resident' => null]);
        }

        // Normalize phone number for flexible matching
        $cleanPhone = preg_replace('/[^0-9]/', '', $phone); // digits only
        $last10 = substr($cleanPhone, -10);

        $resident = User::where('role', 'resident')
            ->where(function($q) use ($last10) {
                $q->where('phone_number', 'LIKE', '%' . $last10)
                  ->orWhere('phone_number', 'LIKE', $last10 . '%');
            })
            ->first();

        if ($resident) {
            // Use model accessor (handles trim, middle name, etc.)
            $fullName = $resident->full_name;

            // If the stored name is still the default placeholder, check if responder
            // typed a real name on a past call (stored on a previous incident's user)
            if (!$fullName || in_array(trim($fullName), ['Unknown Caller', 'Unknown', ''])) {
                // Look for the most recent incident linked to this user that has a real name
                $latestIncident = \App\Models\IncidentDetail::where('user_id', $resident->id)
                    ->with('user')
                    ->orderBy('created_at', 'desc')
                    ->first();

                if ($latestIncident && $latestIncident->user) {
                    $incidentName = $latestIncident->user->full_name;
                    if ($incidentName && !in_array(trim($incidentName), ['Unknown Caller', 'Unknown', ''])) {
                        $fullName = $incidentName;
                    }
                }
            }

            // Extract first and last name from the full name for the separated fields
            $parts = explode(' ', trim($fullName), 2);
            $firstName = $parts[0] ?? '';
            $lastName = $parts[1] ?? '';

            return response()->json([
                'isRegistered' => true,
                'resident' => [
                    'full_name'    => trim($fullName) ?: '',
                    'first_name'   => $firstName,
                    'last_name'    => $lastName,
                    'phone_number' => $resident->phone_number,
                    'latitude'     => null,
                    'longitude'    => null,
                    'address'      => $resident->address
                ]
            ]);
        }

        return response()->json(['isRegistered' => false, 'resident' => null]);
    }

    public function updateIncidentLocation(Request $request, $id)
    {
        $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
        ]);

        $incident = IncidentDetail::find($id);
        if (!$incident) {
            return response()->json(['success' => false, 'message' => 'Incident not found'], 404);
        }

        $incident->update([
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
        ]);

        // Forward the update to Socket.IO telemetry server
        try {
            Http::timeout(3)->post('http://localhost:3000/api/incident-location-update', [
                'incidentId' => $incident->id,
                'latitude' => $incident->latitude,
                'longitude' => $incident->longitude,
                'callerName' => $incident->caller_name ?? 'Unknown Caller',
                'callerNumber' => $incident->caller_number,
                'emergencyType' => $incident->emergencyType ? $incident->emergencyType->name : 'Emergency',
                'status' => $incident->status,
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to forward incident location update to socket server: " . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Location updated successfully',
            'incident' => $incident
        ]);
    }
}
