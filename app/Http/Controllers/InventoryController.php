<?php

namespace App\Http\Controllers;

use App\Models\InventoryItem;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function index(Request $request)
    {
        $query = InventoryItem::query();
        if ($request->has('category') && $request->category !== 'All') {
            $query->where('category', $request->category);
        }

        if ($request->has('is_equipment')) {
            $isEq = filter_var($request->is_equipment, FILTER_VALIDATE_BOOLEAN);
            if ($isEq) {
                $query->whereIn('category', ['Equipment', 'Vehicles']);
            } else {
                $query->whereNotIn('category', ['Equipment', 'Vehicles']);
            }
        }

        if ($request->has('search') && !empty($request->search)) {
            $query->where('name', 'LIKE', '%' . $request->search . '%');
        }
        return response()->json($query->orderBy('created_at', 'desc')->paginate(500));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'item_condition' => 'required|string|max:255',
            'category' => 'required|string|max:255',
            'quantity' => 'required|integer|min:0',
            'unit' => 'nullable|string|max:50',
            'threshold' => 'required|integer|min:0',
        ]);

        $existingItem = InventoryItem::whereRaw('LOWER(name) = ?', [strtolower($validated['name'])])
            ->where('item_condition', $validated['item_condition'])
            ->first();

        if ($existingItem) {
            $newQuantity = $existingItem->quantity + $validated['quantity'];
            $status = $newQuantity <= $existingItem->threshold ? 'Low Stock' : 'Available';
            if ($newQuantity == 0) {
                $status = 'Depleted';
            }
            
            $existingItem->update([
                'quantity' => $newQuantity,
                'status' => $status,
            ]);
            
            if ($validated['quantity'] > 0) {
                $batch = $existingItem->batches()->create([
                    'original_quantity' => $validated['quantity'],
                    'remaining_quantity' => $validated['quantity']
                ]);
                $existingItem->transactions()->create([
                    'inventory_batch_id' => $batch->id,
                    'transaction_type' => 'in',
                    'quantity' => $validated['quantity'],
                    'remarks' => 'Stock added (merged)'
                ]);
            }
            
            return response()->json($existingItem, 200);
        }

        $status = $validated['quantity'] <= $validated['threshold'] ? 'Low Stock' : 'Available';
        if ($validated['quantity'] == 0) {
            $status = 'Depleted';
        }

        $item = InventoryItem::create(array_merge($validated, ['status' => $status]));

        if ($validated['quantity'] > 0) {
            $batch = $item->batches()->create([
                'original_quantity' => $validated['quantity'],
                'remaining_quantity' => $validated['quantity']
            ]);
            $item->transactions()->create([
                'inventory_batch_id' => $batch->id,
                'transaction_type' => 'in',
                'quantity' => $validated['quantity'],
                'remarks' => 'Initial stock'
            ]);
        }

        return response()->json($item, 201);
    }

    public function show($id)
    {
        return response()->json(InventoryItem::findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $item = InventoryItem::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'item_condition' => 'sometimes|required|string|max:255',
            'category' => 'sometimes|required|string|max:255',
            'quantity' => 'sometimes|required|integer|min:0',
            'unit' => 'nullable|string|max:50',
            'threshold' => 'sometimes|required|integer|min:0',
        ]);

        // Check if the user is correcting a typo and it matches an existing item
        if (isset($validated['name'])) {
            $existingItem = InventoryItem::whereRaw('LOWER(name) = ?', [strtolower($validated['name'])])
                ->where('item_condition', $validated['item_condition'] ?? $item->item_condition)
                ->where('id', '!=', $item->id)
                ->first();

            if ($existingItem) {
                // Merge logic: Move transactions and batches to the existing item
                $item->transactions()->update(['inventory_item_id' => $existingItem->id]);
                $item->batches()->update(['inventory_item_id' => $existingItem->id]);
                
                // Add the quantities together
                $newQuantity = $existingItem->quantity + ($validated['quantity'] ?? $item->quantity);
                $status = $newQuantity <= $existingItem->threshold ? 'Low Stock' : 'Available';
                if ($newQuantity == 0) $status = 'Depleted';

                $existingItem->update([
                    'quantity' => $newQuantity,
                    'status' => $status
                ]);

                // Log the merge
                $existingItem->transactions()->create([
                    'inventory_batch_id' => null,
                    'transaction_type' => 'adjust',
                    'quantity' => 0,
                    'remarks' => 'Merged duplicate item (typo correction)'
                ]);

                // Delete the duplicate
                $item->delete();

                return response()->json($existingItem);
            }
        }

        if (isset($validated['quantity']) && isset($validated['threshold'])) {
            $status = $validated['quantity'] <= $validated['threshold'] ? 'Low Stock' : 'Available';
            if ($validated['quantity'] == 0) {
                $status = 'Depleted';
            }
            $validated['status'] = $status;
        } elseif (isset($validated['quantity'])) {
            $status = $validated['quantity'] <= $item->threshold ? 'Low Stock' : 'Available';
            if ($validated['quantity'] == 0) {
                $status = 'Depleted';
            }
            $validated['status'] = $status;
        }

        // If manually adjusting quantity via edit form, log it
        if (isset($validated['quantity']) && $validated['quantity'] !== $item->quantity) {
            $diff = $validated['quantity'] - $item->quantity;
            $item->transactions()->create([
                'inventory_batch_id' => null,
                'transaction_type' => 'adjust',
                'quantity' => $diff,
                'remarks' => 'Manual adjustment via edit'
            ]);
        }

        $item->update($validated);
        return response()->json($item);
    }

    public function destroy($id)
    {
        $item = InventoryItem::findOrFail($id);
        $item->delete();
        return response()->json(null, 204);
    }

    public function stockIn(Request $request, $id)
    {
        $item = InventoryItem::findOrFail($id);
        
        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
            'remarks' => 'nullable|string'
        ]);

        $batch = $item->batches()->create([
            'original_quantity' => $validated['quantity'],
            'remaining_quantity' => $validated['quantity']
        ]);

        $item->transactions()->create([
            'inventory_batch_id' => $batch->id,
            'transaction_type' => 'in',
            'quantity' => $validated['quantity'],
            'remarks' => $validated['remarks'] ?? 'Stock added'
        ]);

        $newQuantity = $item->quantity + $validated['quantity'];
        $status = $newQuantity <= $item->threshold ? 'Low Stock' : 'Available';
        $item->update(['quantity' => $newQuantity, 'status' => $status]);

        return response()->json($item);
    }

    public function distribute(Request $request, $id)
    {
        $item = InventoryItem::findOrFail($id);
        
        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
            'remarks' => 'nullable|string'
        ]);

        if ($validated['quantity'] > $item->quantity) {
            return response()->json(['error' => 'Not enough stock available'], 400);
        }

        $remainingToDistribute = $validated['quantity'];
        $batches = $item->batches()->where('remaining_quantity', '>', 0)->orderBy('created_at', 'asc')->get();

        foreach ($batches as $batch) {
            if ($remainingToDistribute <= 0) break;

            $deduct = min($batch->remaining_quantity, $remainingToDistribute);
            
            $batch->update([
                'remaining_quantity' => $batch->remaining_quantity - $deduct
            ]);

            $item->transactions()->create([
                'inventory_batch_id' => $batch->id,
                'transaction_type' => 'out',
                'quantity' => $deduct,
                'remarks' => $validated['remarks'] ?? 'Stock distributed'
            ]);

            $remainingToDistribute -= $deduct;
        }

        if ($remainingToDistribute > 0) {
            $item->transactions()->create([
                'inventory_batch_id' => null,
                'transaction_type' => 'out',
                'quantity' => $remainingToDistribute,
                'remarks' => ($validated['remarks'] ?? 'Stock distributed') . ' (legacy stock)'
            ]);
        }

        $newQuantity = $item->quantity - $validated['quantity'];
        $status = $newQuantity <= $item->threshold ? 'Low Stock' : 'Available';
        if ($newQuantity == 0) $status = 'Depleted';
        
        $item->update(['quantity' => $newQuantity, 'status' => $status]);

        return response()->json($item);
    }

    public function transactions(Request $request)
    {
        $query = \App\Models\InventoryTransaction::with(['item'])->orderBy('created_at', 'desc');
        
        if ($request->has('type')) {
            $query->where('transaction_type', $request->type);
        }

        return response()->json($query->paginate(20));
    }
    public function bulkUpload(Request $request)
    {
        $request->validate([
            'csv_file' => 'required|file'
        ]);

        $file = $request->file('csv_file');
        if (($handle = fopen($file->getRealPath(), 'r')) !== false) {
            $header = fgetcsv($handle, 1000, ',');
            
            // Expected headers roughly: Name, Condition, Category, Quantity, Unit, Threshold
            
            $addedCount = 0;
            $mergedCount = 0;

            while (($data = fgetcsv($handle, 1000, ',')) !== false) {
                // Ensure row has minimum data (Name, Category, Quantity, Threshold)
                if (count($data) < 4 || empty($data[0])) continue;

                $name = trim($data[0]);
                $condition = isset($data[1]) && !empty(trim($data[1])) ? trim($data[1]) : 'New';
                $category = isset($data[2]) && !empty(trim($data[2])) ? trim($data[2]) : 'Medical Supplies';
                $quantity = isset($data[3]) ? (int)trim($data[3]) : 0;
                $unit = isset($data[4]) && !empty(trim($data[4])) ? trim($data[4]) : 'pcs';
                $threshold = isset($data[5]) ? (int)trim($data[5]) : 10;

                $existingItem = InventoryItem::whereRaw('LOWER(name) = ?', [strtolower($name)])
                    ->where('item_condition', $condition)
                    ->first();

                if ($existingItem) {
                    $newQuantity = $existingItem->quantity + $quantity;
                    $status = $newQuantity <= $existingItem->threshold ? 'Low Stock' : 'Available';
                    if ($newQuantity == 0) $status = 'Depleted';
                    
                    $existingItem->update([
                        'quantity' => $newQuantity,
                        'status' => $status,
                    ]);
                    
                    if ($quantity > 0) {
                        $batch = $existingItem->batches()->create([
                            'original_quantity' => $quantity,
                            'remaining_quantity' => $quantity
                        ]);
                        $existingItem->transactions()->create([
                            'inventory_batch_id' => $batch->id,
                            'transaction_type' => 'in',
                            'quantity' => $quantity,
                            'remarks' => 'Bulk CSV upload (merged)'
                        ]);
                    }
                    $mergedCount++;
                } else {
                    $status = $quantity <= $threshold ? 'Low Stock' : 'Available';
                    if ($quantity == 0) $status = 'Depleted';

                    $item = InventoryItem::create([
                        'name' => $name,
                        'item_condition' => $condition,
                        'category' => $category,
                        'quantity' => $quantity,
                        'unit' => $unit,
                        'threshold' => $threshold,
                        'status' => $status,
                    ]);

                    if ($quantity > 0) {
                        $batch = $item->batches()->create([
                            'original_quantity' => $quantity,
                            'remaining_quantity' => $quantity
                        ]);
                        $item->transactions()->create([
                            'inventory_batch_id' => $batch->id,
                            'transaction_type' => 'in',
                            'quantity' => $quantity,
                            'remarks' => 'Bulk CSV upload (initial)'
                        ]);
                    }
                    $addedCount++;
                }
            }
            fclose($handle);

            return response()->json([
                'success' => true,
                'message' => "Successfully processed CSV. Added: $addedCount, Merged: $mergedCount"
            ]);
        }

        return response()->json(['error' => 'Failed to open CSV file.'], 500);
    }
}
