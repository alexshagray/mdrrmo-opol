<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class IncidentReport extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'incident_id',

        'call_id',
        'emergency_type_id',
        'caller_type',
        'status',
        'report_date',
    ];

    protected $casts = [
        'report_date' => 'datetime',
    ];

    protected $with = ['location', 'emergencyType'];
    protected $appends = ['latitude', 'longitude', 'barangay', 'purok', 'landmark', 'address_location'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function location(): HasOne
    {
        return $this->hasOne(IncidentLocation::class);
    }

    public function emergencyType(): BelongsTo
    {
        return $this->belongsTo(EmergencyType::class);
    }

    public function getLatitudeAttribute()
    {
        return $this->location ? $this->location->latitude : null;
    }

    public function getLongitudeAttribute()
    {
        return $this->location ? $this->location->longitude : null;
    }

    public function getBarangayAttribute()
    {
        return $this->location ? $this->location->barangay : null;
    }

    public function getPurokAttribute()
    {
        return $this->location ? $this->location->purok : null;
    }

    public function getLandmarkAttribute()
    {
        return $this->location ? $this->location->landmark : null;
    }

    public function getAddressLocationAttribute()
    {
        return $this->location ? $this->location->location : null;
    }
}
