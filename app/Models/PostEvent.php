<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PostEvent extends Model
{
    use HasFactory;

    protected $fillable = [
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
}
