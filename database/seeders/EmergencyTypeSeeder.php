<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class EmergencyTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $types = [
            ['name' => 'EMERGENCY RESPONSE', 'color_hex' => '#ef4444', 'emoji_icon' => '🚑', 'severity_level' => 'Critical', 'description' => 'General medical or critical emergency response'],
            ['name' => 'VEHICULAR EMERGENCY EXTRICATION', 'color_hex' => '#f59e0b', 'emoji_icon' => '🚗', 'severity_level' => 'High', 'description' => 'Vehicle accidents requiring extrication'],
            ['name' => 'WATER RESCUE', 'color_hex' => '#3b82f6', 'emoji_icon' => '🌊', 'severity_level' => 'High', 'description' => 'Drowning, flood, or water-related emergencies'],
            ['name' => 'HIGH ANGLE RESCUE', 'color_hex' => '#8b5cf6', 'emoji_icon' => '🧗', 'severity_level' => 'High', 'description' => 'Rescues from cliffs, towers, or high structures'],
            ['name' => 'SEARCH AND RESCUE', 'color_hex' => '#10b981', 'emoji_icon' => '🚁', 'severity_level' => 'High', 'description' => 'General search and rescue operations'],
            ['name' => 'BREAKING AND BREACHING (COLLAPSE)', 'color_hex' => '#6b7280', 'emoji_icon' => '🏢', 'severity_level' => 'Critical', 'description' => 'Structural collapse or trapped individuals'],
            ['name' => 'LANDSLIDE/MOUNTAIN SEARCH & RESCUE', 'color_hex' => '#b45309', 'emoji_icon' => '⛰️', 'severity_level' => 'Critical', 'description' => 'Landslides or mountain rescue operations'],
        ];

        foreach ($types as $type) {
            \App\Models\EmergencyType::create($type);
        }
    }
}
