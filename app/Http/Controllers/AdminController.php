<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AdminController extends Controller
{
    /**
     * Get all users (both pending and approved).
     */
    public function users(Request $request)
    {
        // Enforce that only admin can access this controller
        if ($request->user()->role !== 'admin') {
            return response()->json([
                'message' => 'Unauthorized. Admin access required.'
            ], 403);
        }

        $users = User::orderBy('created_at', 'desc')->paginate(10);

        return response()->json($users);
    }

    /**
     * Approve user registration.
     */
    public function approve(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json([
                'message' => 'Unauthorized. Admin access required.'
            ], 403);
        }

        $user = User::findOrFail($id);
        $user->approved = true;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'User approved successfully.',
            'user' => $user
        ]);
    }

    /**
     * Reject user registration (delete user).
     */
    public function reject(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json([
                'message' => 'Unauthorized. Admin access required.'
            ], 403);
        }

        $user = User::findOrFail($id);
        
        // Prevent deleting the main admin themselves
        if ($user->role === 'admin') {
            return response()->json([
                'message' => 'Cannot reject/delete admin accounts.'
            ], 400);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'User account rejected/deleted successfully.'
        ]);
    }

    /**
     * Create a new Staff account directly from the Admin dashboard.
     */
    public function storeStaff(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json([
                'message' => 'Unauthorized. Admin access required.'
            ], 403);
        }

        try {
            $validated = $request->validate([
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'email' => 'required|string|email|max:255|unique:users',
                'role' => 'required|in:staff1,staff2',
                'password' => 'required|string|min:6|confirmed',
            ]);

            $user = User::create([
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role' => $validated['role'],
                'phone_number' => 'N/A_' . time() . '_' . rand(1000, 9999), // Required by DB and must be unique
                'approved' => true, // Auto-approve since admin creates it
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Staff account created successfully.',
                'user' => $user
            ], 201);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation Failed',
                'errors' => $e->errors()
            ], 422);
        }
    }
}
