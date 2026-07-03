<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'item_condition',
        'category',
        'quantity',
        'unit',
        'threshold',
        'status',
    ];

    public function batches()
    {
        return $this->hasMany(InventoryBatch::class);
    }

    public function transactions()
    {
        return $this->hasMany(InventoryTransaction::class);
    }
}
