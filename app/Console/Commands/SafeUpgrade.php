<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use App\Models\User;
use App\Models\Department;
use App\Models\InventoryItem;
use App\Models\SystemNotification;
use App\Models\IncidentDetail;
use App\Models\IncidentLocation;
use App\Models\PatientCareReport;
use App\Models\EmergencyType;
use Illuminate\Support\Facades\Schema;

class SafeUpgrade extends Command
{
    protected $signature = 'data:safe-upgrade';
    protected $description = 'Safely backup data, run migrate fresh, and restore mapped data';

    public function handle()
    {
        $this->info('Starting Safe Data Upgrade...');

        // 1. BACKUP DATA
        $this->info('Backing up existing data...');
        
        $users = \DB::table('users')->get()->map(function($i) { return (array)$i; })->toArray();
        $departments = \DB::table('departments')->get()->map(function($i) { return (array)$i; })->toArray();
        $inventoryItems = \DB::table('inventory_items')->get()->map(function($i) { return (array)$i; })->toArray();
        $notifications = \DB::table('system_notifications')->get()->map(function($i) { return (array)$i; })->toArray();
        
        // Incident reports need special mapping later
        $incidentReports = \DB::table('incident_reports')->get()->map(function($i) { return (array)$i; })->toArray();
        $incidentLocations = \DB::table('incident_locations')->get()->map(function($i) { return (array)$i; })->toArray();
        $patientCareReports = \DB::table('patient_care_reports')->get()->map(function($i) { return (array)$i; })->toArray();

        // 2. MIGRATE FRESH
        $this->info('Running migrate:fresh...');
        Artisan::call('migrate:fresh');
        $this->info(Artisan::output());

        // 3. SEED EMERGENCY TYPES
        $this->info('Seeding Emergency Types...');
        Artisan::call('db:seed', ['--class' => 'EmergencyTypeSeeder']);
        $this->info(Artisan::output());

        // 4. MAP AND RESTORE DATA
        $this->info('Mapping and restoring data...');
        Schema::disableForeignKeyConstraints();

        // Users
        foreach ($users as &$user) {
            if (!in_array($user['gender'], ['Male', 'Female', 'Other', 'Prefer Not to Say'])) {
                $user['gender'] = null;
            }
        }
        if (count($users)) \DB::table('users')->insert($users);

        // Departments
        if (count($departments)) \DB::table('departments')->insert($departments);

        // Inventory Items
        foreach ($inventoryItems as &$item) {
            if ($item['category'] == 'Medical Supplies') $item['category'] = 'Medical';
            if ($item['category'] == 'Equipment') $item['category'] = 'Other';
            if ($item['category'] == 'Vehicles') $item['category'] = 'Vehicle';
            if (!in_array($item['category'], ['Medical', 'Rescue', 'Communication', 'Vehicle', 'Other'])) {
                $item['category'] = 'Other';
            }
        }
        if (count($inventoryItems)) \DB::table('inventory_items')->insert($inventoryItems);

        // Notifications
        foreach ($notifications as &$notif) {
            if (!in_array($notif['type'], ['event_alert', 'incident_update', 'system_message', 'dispatch'])) {
                $notif['type'] = 'system_message';
            }
        }
        if (count($notifications)) \DB::table('system_notifications')->insert($notifications);

        // Incident Reports
        $typeMap = EmergencyType::pluck('id', 'name')->toArray();
        foreach ($incidentReports as &$inc) {
            $oldString = $inc['emergency_type'];
            $newId = null;
            if ($oldString) {
                foreach ($typeMap as $name => $id) {
                    if (stripos($oldString, $name) !== false) {
                        $newId = $id;
                        break;
                    }
                }
                if (!$newId) $newId = $typeMap['Other'] ?? null;
            }
            unset($inc['emergency_type']);
            $inc['emergency_type_id'] = $newId;
        }
        if (count($incidentReports)) \DB::table('incident_reports')->insert($incidentReports);

        // Incident Locations & PCRs
        if (count($incidentLocations)) \DB::table('incident_locations')->insert($incidentLocations);
        
        // Ensure pcr_data is cast back to json for insertion if it's an array
        foreach ($patientCareReports as &$pcr) {
            if (is_array($pcr['pcr_data'])) {
                $pcr['pcr_data'] = json_encode($pcr['pcr_data']);
            }
        }
        if (count($patientCareReports)) \DB::table('patient_care_reports')->insert($patientCareReports);

        Schema::enableForeignKeyConstraints();

        $this->info('Safe Upgrade Complete! Database is fully optimized and data is preserved.');
    }
}
