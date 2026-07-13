<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\EmergencyType;

class EmergencyTypeController extends Controller
{
    /**
     * Return all emergency types.
     */
    public function index()
    {
        return response()->json(EmergencyType::orderBy('emergency_name')->get());
    }

    /**
     * Save a new emergency type if it doesn't already exist.
     * Prevents duplicates by checking case-insensitively.
     */
    public function store(Request $request)
    {
        $request->validate([
            'emergency_name' => 'required|string|max:255',
        ]);

        $name = trim($request->input('emergency_name'));
        $nameLower = strtolower($name);

        // Check for case-insensitive duplicate
        $existing = EmergencyType::whereRaw('LOWER(emergency_name) = ?', [$nameLower])->first();
        if ($existing) {
            return response()->json([
                'success'  => true,
                'message'  => 'Emergency type already exists',
                'data'     => $existing,
                'existing' => true,
            ]);
        }

        // Resolve icon and color from keywords so new types get proper icons immediately
        $emoji = EmergencyType::resolveEmoji($nameLower);
        $color = EmergencyType::resolveColor($nameLower);

        $type = EmergencyType::create([
            'emergency_name' => $name,
            'description'    => $request->input('description', 'Custom emergency type'),
            'emoji_icon'     => $emoji,
            'color_hex'      => $color,
        ]);

        return response()->json([
            'success'  => true,
            'message'  => 'Emergency type saved successfully',
            'data'     => $type,
            'existing' => false,
        ], 201);
    }
}
