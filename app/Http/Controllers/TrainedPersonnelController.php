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
            $query->whereHas('barangayModel', function($q) use ($request) {
                $q->where('barangay_name', $request->barangay);
            });
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
        $data = $request->validate([
            'name' => 'required|string',
            'age' => 'nullable|integer',
            'sex' => 'required|string',
        ]);
        
        $data['barangay_id'] = $request->input('barangay_id');
        if (!$data['barangay_id'] && $request->input('barangay')) {
            $b = \App\Models\Barangay::where('barangay_name', $request->input('barangay'))->first();
            if ($b) $data['barangay_id'] = $b->id;
        }

        $personnel = TrainedPersonnel::create($data);
        return response()->json($personnel, 201);
    }

    public function update(Request $request, $id)
    {
        $personnel = TrainedPersonnel::findOrFail($id);
        $data = $request->validate([
            'name' => 'sometimes|string',
            'age' => 'nullable|integer',
            'sex' => 'sometimes|string',
        ]);

        if ($request->has('barangay_id')) {
            $data['barangay_id'] = $request->input('barangay_id');
        } elseif ($request->has('barangay')) {
            $b = \App\Models\Barangay::where('barangay_name', $request->input('barangay'))->first();
            if ($b) $data['barangay_id'] = $b->id;
        }

        $personnel->update($data);
        return response()->json($personnel);
    }

    public function destroy($id)
    {
        TrainedPersonnel::destroy($id);
        return response()->json(['success' => true]);
    }
}
