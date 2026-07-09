<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ResidentAuthController extends Controller

{
   
    
    public function register(Request $request)
    {
        $request->validate([
            'full_name' => 'required|string|max:255',
            'phone_number' => 'required|string|unique:users',
            'email' => 'nullable|email|unique:users',
            'address' => 'required|string|max:500',
            'password' => 'required|string|min:6',
        ]);

        $nameParts = explode(' ', $request->full_name, 2);
        $firstName = $nameParts[0];
        $lastName = $nameParts[1] ?? '';

        $resident = User::create([
            'first_name' => $firstName,
            'last_name' => $lastName,
            'phone_number' => $request->phone_number,
            'email' => $request->email,
            'address' => $request->address,
            'password' => Hash::make($request->password),
            'role' => 'resident',
        ]);

        $token = $resident->createToken('resident_auth_token')->plainTextToken;

        return response()->json([
            'resident' => $resident,
            'access_token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

    public function login(Request $request)
    {
        $request->validate([
            'phone_number' => 'required|string',
            'password' => 'required|string',
        ]);

        $resident = User::where('phone_number', $request->phone_number)
                        ->where('role', 'resident')
                        ->first();

        if (! $resident || ! Hash::check($request->password, $resident->password)) {
            throw ValidationException::withMessages([
                'phone_number' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $resident->createToken('resident_auth_token')->plainTextToken;

        return response()->json([
            'resident' => $resident,
            'access_token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    }

    public function checkResident(Request $request)
    {
        $phoneNumber = $request->query('phone_number');
        if (!$phoneNumber) {
            return response()->json([
                'isRegistered' => false,
                'resident' => null
            ]);
        }

        // Clean the query number to get digits only
        $cleanPhone = preg_replace('/[^0-9]/', '', $phoneNumber);
        
        // Try exact match first
        $resident = User::where('phone_number', $phoneNumber)
                        ->where('role', 'resident')
                        ->first();
        
        if (!$resident && strlen($cleanPhone) >= 9) {
            // Match by last 9 digits (handles varying country codes and formatting)
            $lastDigits = substr($cleanPhone, -9);
            $resident = User::where('phone_number', 'LIKE', '%' . $lastDigits)
                            ->where('role', 'resident')
                            ->first();
        }

        if ($resident) {
            return response()->json([
                'isRegistered' => true,
                'resident' => $resident
            ]);
        }

        return response()->json([
            'isRegistered' => false,
            'resident' => null
        ]);
    }
}
