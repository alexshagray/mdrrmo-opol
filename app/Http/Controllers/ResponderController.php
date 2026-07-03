<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

class ResponderController extends Controller
{
    public function index()
    {
        return response()->json(User::where('role', 'responder')->get());
    }
}
