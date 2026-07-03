<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class EmergencyType extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'color_hex',
        'emoji_icon',
        'severity_level'
    ];
}
