<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IncidentLocation extends Model
{
    protected $fillable = [
        'incident_detail_id',
        'latitude',
        'longitude',
        'location',
        'barangay',
        'purok',
        'landmark'
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
    ];

    public function report(): BelongsTo
    {
        return $this->belongsTo(IncidentDetail::class, 'incident_detail_id');
    }
}
