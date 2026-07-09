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
            ['emergency_name' => 'EMERGENCY RESPONSE', 'description' => 'General medical or critical emergency response'],
            ['emergency_name' => 'VEHICULAR EMERGENCY EXTRICATION', 'description' => 'Vehicle accidents requiring extrication'],
            ['emergency_name' => 'WATER RESCUE', 'description' => 'Drowning, flood, or water-related emergencies'],
            ['emergency_name' => 'HIGH ANGLE RESCUE', 'description' => 'Rescues from cliffs, towers, or high structures'],
            ['emergency_name' => 'SEARCH AND RESCUE', 'description' => 'General search and rescue operations'],
            ['emergency_name' => 'BREAKING AND BREACHING (COLLAPSE)', 'description' => 'Structural collapse or trapped individuals'],
            ['emergency_name' => 'LANDSLIDE/MOUNTAIN SEARCH & RESCUE', 'description' => 'Landslides or mountain rescue operations'],
        ];

        foreach ($types as $type) {
            \App\Models\EmergencyType::updateOrCreate(
                ['emergency_name' => $type['emergency_name']],
                ['description' => $type['description']]
            );
        }
    }
}
