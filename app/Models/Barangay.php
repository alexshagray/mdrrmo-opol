<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Barangay extends Model
{
    use HasFactory;

    protected $fillable = [
        'barangay_name',
        'latitude',
        'longitude',
        'boundary_polygon',
        'zones',
        'landmarks',
    ];

    protected $casts = [
        'latitude' => 'float',
        'longitude' => 'float',
        'boundary_polygon' => 'array',
        'zones' => 'array',
        'landmarks' => 'array',
    ];

    protected $appends = ['name'];

    public function getNameAttribute()
    {
        return $this->barangay_name;
    }
}
