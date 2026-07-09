<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PostEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'event_type',
        'description',
        'location',
        'event_date',
        'start_time',
        'end_time',
        'status',
    ];

    protected $casts = [
        'event_date' => 'datetime',
    ];

    protected $appends = ['creator_name'];

    public function creator()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function getCreatorNameAttribute()
    {
        return $this->creator ? $this->creator->name : 'System';
    }
}
