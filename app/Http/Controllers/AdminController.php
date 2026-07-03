<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

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
}
