<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class EmergencyType extends Model
{
    use HasFactory;

    protected $fillable = [
        'emergency_name',
        'description'
    ];

    protected $appends = ['name', 'color_hex', 'emoji_icon'];

    public function getNameAttribute()
    {
        return $this->emergency_name;
    }

    public function getColorHexAttribute()
    {
        // Fallback colors based on emergency name
        $name = strtolower($this->emergency_name);
        if (str_contains($name, 'medical') || str_contains($name, 'response')) return '#ef4444';
        if (str_contains($name, 'rescue')) return '#3b82f6';
        if (str_contains($name, 'fire')) return '#f97316';
        return '#a855f7';
    }

    public function getEmojiIconAttribute()
    {
        // Fallback icons
        $name = strtolower($this->emergency_name);
        if (str_contains($name, 'medical') || str_contains($name, 'response')) return '🚑';
        if (str_contains($name, 'rescue')) return '🚁';
        if (str_contains($name, 'fire')) return '🔥';
        return '🚨';
    }
}
