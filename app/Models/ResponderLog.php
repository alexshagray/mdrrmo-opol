<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ResponderLog extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'responder_id',
        'incident_detail_id',
        'latitude',
        'longitude',
        'status',
        'report_date',
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'report_date' => 'datetime',
    ];

    public function responder()
    {
        return $this->belongsTo(User::class, 'responder_id');
    }

    public function incidentDetail()
    {
        return $this->belongsTo(IncidentDetail::class, 'incident_detail_id');
    }

    protected $appends = ['incident_id'];

    public function getIncidentIdAttribute()
    {
        return $this->incidentDetail ? $this->incidentDetail->incident_id : null;
    }
}
