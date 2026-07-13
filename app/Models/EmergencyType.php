<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class EmergencyType extends Model
{
    use HasFactory;

    protected $fillable = [
        'emergency_name',
        'description',
        'emoji_icon',
        'color_hex',
    ];

    protected $appends = ['name'];

    /**
     * Virtual 'name' accessor so the rest of the app can use emergency_type.name
     */
    public function getNameAttribute(): string
    {
        return $this->emergency_name;
    }

    /**
     * Smart emoji resolver: use stored value first, fall back to keyword matching.
     */
    public function getEmojiIconAttribute(): string
    {
        // Use stored value if it exists and is not the default
        if (!empty($this->attributes['emoji_icon']) && $this->attributes['emoji_icon'] !== '🚨') {
            return $this->attributes['emoji_icon'];
        }

        return self::resolveEmoji(strtolower($this->emergency_name));
    }

    /**
     * Smart color resolver: use stored value first, fall back to keyword matching.
     */
    public function getColorHexAttribute(): string
    {
        // Use stored value if it exists and is not the default purple
        if (!empty($this->attributes['color_hex']) && $this->attributes['color_hex'] !== '#a855f7') {
            return $this->attributes['color_hex'];
        }

        return self::resolveColor(strtolower($this->emergency_name));
    }

    /**
     * Resolve emoji icon based on emergency name keywords.
     */
    public static function resolveEmoji(string $nameLower): string
    {
        if (str_contains($nameLower, 'medical') || str_contains($nameLower, 'response') || str_contains($nameLower, 'cardiac') || str_contains($nameLower, 'heart')) return '🚑';
        if (str_contains($nameLower, 'rescue') || str_contains($nameLower, 'mountain') || str_contains($nameLower, 'search')) return '🚁';
        if (str_contains($nameLower, 'fire') || str_contains($nameLower, 'blaze') || str_contains($nameLower, 'burn')) return '🔥';
        if (str_contains($nameLower, 'flood') || str_contains($nameLower, 'drown') || str_contains($nameLower, 'water rescue')) return '🌊';
        if (str_contains($nameLower, 'tsunami') || str_contains($nameLower, 'tidal')) return '🌊';
        if (str_contains($nameLower, 'landslide') || str_contains($nameLower, 'mudslide') || str_contains($nameLower, 'earthquake') || str_contains($nameLower, 'quake') || str_contains($nameLower, 'collapsed')) return '⛰️';
        if (str_contains($nameLower, 'vehicular') || str_contains($nameLower, 'accident') || str_contains($nameLower, 'crash') || str_contains($nameLower, 'collision') || str_contains($nameLower, 'car')) return '🚗';
        if (str_contains($nameLower, 'snake') || str_contains($nameLower, 'animal') || str_contains($nameLower, 'bite') || str_contains($nameLower, 'rabies')) return '🐍';
        if (str_contains($nameLower, 'power') || str_contains($nameLower, 'electric') || str_contains($nameLower, 'outage') || str_contains($nameLower, 'electrocution')) return '⚡';
        if (str_contains($nameLower, 'typhoon') || str_contains($nameLower, 'storm') || str_contains($nameLower, 'cyclone') || str_contains($nameLower, 'hurricane') || str_contains($nameLower, 'tornado')) return '🌀';
        if (str_contains($nameLower, 'explosion') || str_contains($nameLower, 'bomb') || str_contains($nameLower, 'blast') || str_contains($nameLower, 'chemical') || str_contains($nameLower, 'hazmat')) return '💥';
        if (str_contains($nameLower, 'missing') || str_contains($nameLower, 'lost person')) return '🔍';
        if (str_contains($nameLower, 'violence') || str_contains($nameLower, 'assault') || str_contains($nameLower, 'crime')) return '🚨';

        return '🚨'; // Generic fallback
    }

    /**
     * Resolve color hex based on emergency name keywords.
     */
    public static function resolveColor(string $nameLower): string
    {
        if (str_contains($nameLower, 'medical') || str_contains($nameLower, 'response') || str_contains($nameLower, 'cardiac') || str_contains($nameLower, 'heart')) return '#ef4444';
        if (str_contains($nameLower, 'rescue') || str_contains($nameLower, 'mountain') || str_contains($nameLower, 'search')) return '#3b82f6';
        if (str_contains($nameLower, 'fire') || str_contains($nameLower, 'blaze') || str_contains($nameLower, 'burn')) return '#f97316';
        if (str_contains($nameLower, 'flood') || str_contains($nameLower, 'drown') || str_contains($nameLower, 'water rescue') || str_contains($nameLower, 'tsunami')) return '#0ea5e9';
        if (str_contains($nameLower, 'landslide') || str_contains($nameLower, 'mudslide') || str_contains($nameLower, 'earthquake') || str_contains($nameLower, 'quake') || str_contains($nameLower, 'collapsed')) return '#78716c';
        if (str_contains($nameLower, 'vehicular') || str_contains($nameLower, 'accident') || str_contains($nameLower, 'crash') || str_contains($nameLower, 'collision') || str_contains($nameLower, 'car')) return '#f59e0b';
        if (str_contains($nameLower, 'snake') || str_contains($nameLower, 'animal') || str_contains($nameLower, 'bite') || str_contains($nameLower, 'rabies')) return '#84cc16';
        if (str_contains($nameLower, 'power') || str_contains($nameLower, 'electric') || str_contains($nameLower, 'outage') || str_contains($nameLower, 'electrocution')) return '#eab308';
        if (str_contains($nameLower, 'typhoon') || str_contains($nameLower, 'storm') || str_contains($nameLower, 'cyclone') || str_contains($nameLower, 'hurricane') || str_contains($nameLower, 'tornado')) return '#6366f1';
        if (str_contains($nameLower, 'explosion') || str_contains($nameLower, 'bomb') || str_contains($nameLower, 'blast') || str_contains($nameLower, 'chemical') || str_contains($nameLower, 'hazmat')) return '#dc2626';
        if (str_contains($nameLower, 'missing') || str_contains($nameLower, 'lost person')) return '#8b5cf6';

        return '#a855f7'; // Generic purple fallback
    }
}
