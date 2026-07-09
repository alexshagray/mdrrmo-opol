<?php

namespace App\Http\Controllers;

use App\Models\Barangay;
use Illuminate\Http\Request;

class BarangayController extends Controller
{
    public function index()
    {
        $barangays = Barangay::all();
        return response()->json($barangays);
    }
}
