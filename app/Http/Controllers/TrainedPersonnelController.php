<?php

namespace App\Http\Controllers;

use App\Models\TrainedPersonnel;
use Illuminate\Http\Request;

class TrainedPersonnelController extends Controller
{
    public function index(Request $request)
    {
        $query = TrainedPersonnel::query();
        if ($request->has('barangay') && $request->barangay !== 'All') {
            $query->where('barangay', $request->barangay);
        }
        if ($request->has('search') && !empty($request->search)) {
            $searchTerms = explode(' ', $request->search);
            $query->where(function ($q) use ($searchTerms) {
                foreach ($searchTerms as $term) {
                    $term = trim($term);
                    if ($term !== '') {
                        $q->where('name', 'LIKE', '%' . $term . '%');
                    }
                }
            });
        }
        return response()->json($query->paginate(10));
    }

    public function store(Request $request)
    {
        $personnel = TrainedPersonnel::create($request->validate([
            'name' => 'required|string',
            'age' => 'nullable|integer',
            'sex' => 'required|string',
            'zone' => 'nullable|string',
            'barangay' => 'required|string',
        ]));
        return response()->json($personnel, 201);
    }

    public function update(Request $request, $id)
    {
        $personnel = TrainedPersonnel::findOrFail($id);
        $personnel->update($request->validate([
            'name' => 'sometimes|string',
            'age' => 'nullable|integer',
            'sex' => 'sometimes|string',
            'zone' => 'nullable|string',
            'barangay' => 'sometimes|string',
        ]));
        return response()->json($personnel);
    }

    public function destroy($id)
    {
        TrainedPersonnel::destroy($id);
        return response()->json(['success' => true]);
    }
}
