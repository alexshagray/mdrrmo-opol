<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Barangay;
use Illuminate\Support\Facades\File;

class BarangaySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $barangayCoordinates = [
            'awang' => ['latitude' => 8.4400, 'longitude' => 124.5000],
            'barra' => ['latitude' => 8.5146, 'longitude' => 124.6223],
            'bagocboc' => ['latitude' => 8.4100, 'longitude' => 124.4800],
            'bonbon' => ['latitude' => 8.5250, 'longitude' => 124.5700],
            'cauyunan' => ['latitude' => 8.3500, 'longitude' => 124.4500],
            'igpit' => ['latitude' => 8.5132, 'longitude' => 124.6083],
            'luyong bonbon' => ['latitude' => 8.5300, 'longitude' => 124.5500],
            'limunda' => ['latitude' => 8.3200, 'longitude' => 124.4200],
            'malanang' => ['latitude' => 8.4900, 'longitude' => 124.5900],
            'nangcaon' => ['latitude' => 8.4000, 'longitude' => 124.4700],
            'patag' => ['latitude' => 8.4800, 'longitude' => 124.5300],
            'poblacion' => ['latitude' => 8.5215, 'longitude' => 124.5768],
            'tingalan' => ['latitude' => 8.3700, 'longitude' => 124.4300],
            'taboc' => ['latitude' => 8.5150, 'longitude' => 124.5850],
        ];

        $jsonPath = resource_path('js/data/barangay.json');
        
        if (File::exists($jsonPath)) {
            $json = File::get($jsonPath);
            $data = json_decode($json, true);

            if (isset($data['features'])) {
                foreach ($data['features'] as $feature) {
                    $nameLower = strtolower($feature['properties']['barangay_name'] ?? $feature['properties']['name'] ?? '');
                    
                    // Normalize name
                    if ($nameLower === 'luyong') {
                        $nameLower = 'luyong bonbon';
                    }
                    
                    if (isset($barangayCoordinates[$nameLower])) {
                        
                        // Seed default generic zones and landmarks for each barangay
                        $defaultZones = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5', 'Zone 6'];
                        $defaultLandmarks = [];
                        if ($nameLower === 'barra') {
                            $defaultLandmarks = ['YANEZ STORE'];
                        }

                        Barangay::updateOrCreate(
                            ['barangay_name' => ucwords($nameLower)],
                            [
                                'latitude' => $barangayCoordinates[$nameLower]['latitude'],
                                'longitude' => $barangayCoordinates[$nameLower]['longitude'],
                                'boundary_polygon' => $feature['geometry'],
                                'zones' => $defaultZones,
                                'landmarks' => $defaultLandmarks,
                            ]
                        );
                    }
                }
            }
        }
        
        // Add any missing barangays without polygons just in case
        foreach ($barangayCoordinates as $nameLower => $coords) {
            Barangay::firstOrCreate(
                ['barangay_name' => ucwords($nameLower)],
                [
                    'latitude' => $coords['latitude'],
                    'longitude' => $coords['longitude'],
                    'zones' => ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5', 'Zone 6'],
                    'landmarks' => [],
                ]
            );
        }
    }
}
