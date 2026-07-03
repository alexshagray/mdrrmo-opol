<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class EmergencyTypeController extends Controller
{
    public function index()
    {
        return response()->json(\App\Models\EmergencyType::all());
    }
}
