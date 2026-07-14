<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

class ResponderController extends Controller
{
    public function index(Request $request)
    {
        $query = User::where('role', 'responder');

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(\Illuminate\Support\Facades\DB::raw('CONCAT(first_name, " ", last_name)'), 'LIKE', "%{$search}%");
        }

        return response()->json($query->get());
    }
}
