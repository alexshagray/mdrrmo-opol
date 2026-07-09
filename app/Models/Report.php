<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Report extends Model
{
    protected $fillable = [
        'user_id',
        'patient_id',
        'department_id',
        'report_type',
        'title',
        'description',
        'status',
        'report_date',
    ];

    protected $casts = [
        'report_date' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function patientCareRecord(): HasOne
    {
        return $this->hasOne(patientCareRecord::class);
    }

    public function incidentDetail(): HasOne
    {
        return $this->hasOne(IncidentDetail::class);
    }
}
