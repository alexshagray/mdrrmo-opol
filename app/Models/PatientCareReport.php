<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PatientCareReport extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'patient_id',
        'incident_id',
        'status',
        'pcr_data',
        'report_date',
    ];

    protected $appends = ['full_name', 'contact_number', 'address', 'emergency_type', 'latitude', 'longitude'];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'pcr_data' => 'array',
        'report_date' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patient_id');
    }
    public function incident(): BelongsTo
    {
        return $this->belongsTo(IncidentReport::class, 'incident_id', 'incident_id');
    }

    public function getFullNameAttribute()
    {
        return $this->patient ? $this->patient->name : 'Unknown';
    }

    public function getContactNumberAttribute()
    {
        return $this->patient ? $this->patient->phone_number : null;
    }

    public function getAddressAttribute()
    {
        return $this->patient ? $this->patient->address : null;
    }

    public function getEmergencyTypeAttribute()
    {
        if ($this->incident && !empty($this->incident->emergency_type)) {
            return $this->incident->emergency_type;
        }
        
        $pcrData = $this->pcr_data;
        if (is_string($pcrData)) {
            $pcrData = json_decode($pcrData, true);
        }
        
        return $pcrData['step1']['chiefComplaint'] ?? $pcrData['step1']['natureOfCall'] ?? 'Unknown';
    }

    public function getLatitudeAttribute()
    {
        return $this->incident ? $this->incident->latitude : null;
    }

    public function getLongitudeAttribute()
    {
        return $this->incident ? $this->incident->longitude : null;
    }
}
