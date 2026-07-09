<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\IncidentDetail;
use App\Models\IncidentLocation;
use App\Models\PatientCareRecord;
use App\Models\InventoryItem;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(BarangaySeeder::class);
        $this->call(EmergencyTypeSeeder::class);

        // 1. Create System Administrators
        $admin = User::create([
            'first_name' => 'System',
            'last_name' => 'Administrator',
            'phone_number' => '+639000000001',
            'email' => 'admin@balansag.com',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'approved' => true,
        ]);

        $staff1 = User::create([
            'first_name' => 'Staff',
            'last_name' => 'One',
            'phone_number' => '+639000000002',
            'email' => 'staff1@balansag.com',
            'password' => Hash::make('password123'),
            'role' => 'staff1',
            'approved' => true,
        ]);

        $staff2 = User::create([
            'first_name' => 'Staff',
            'last_name' => 'Two',
            'phone_number' => '+639000000022',
            'email' => 'staff2@balansag.com',
            'password' => Hash::make('password123'),
            'role' => 'staff2',
            'approved' => true,
        ]);

        // 2. Create Active Approved Responders
        $responder = User::create([
            'first_name' => 'John',
            'last_name' => 'Doe',
            'phone_number' => '+639000000003',
            'email' => 'john.doe@balansag.com',
            'password' => Hash::make('password123'),
            'role' => 'responder',
            'approved' => true,
        ]);

        // 3. Create Pending Responder Requests for Approval Testing
        User::create([
            'first_name' => 'Maria',
            'last_name' => 'Clara',
            'phone_number' => '+639000000004',
            'email' => 'maria@balansag.com',
            'password' => Hash::make('password123'),
            'role' => 'responder',
            'approved' => false,
        ]);

        User::create([
            'first_name' => 'Mark',
            'last_name' => 'Cruz',
            'phone_number' => '+639000000005',
            'email' => 'mark@balansag.com',
            'password' => Hash::make('password123'),
            'role' => 'responder',
            'approved' => false,
        ]);

        // 4. Create Registered Residents / Patients in Opol, Misamis Oriental
        $patient1 = User::create([
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'phone_number' => '+639500905679', // Matches mobile client simulator phone lookup exactly
            'email' => 'juan@dela-cruz.com',
            'password' => Hash::make('password123'),
            'role' => 'resident',
            'address' => 'Purok 3, Barangay Poblacion, Opol, Misamis Oriental',
        ]);

        $patient2 = User::create([
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'phone_number' => '+639123456789',
            'email' => 'maria@santos.com',
            'password' => Hash::make('password123'),
            'role' => 'resident',
            'address' => 'Purok 5, Riverside, Opol, Misamis Oriental',
        ]);

        $patient3 = User::create([
            'first_name' => 'Elena',
            'last_name' => 'Reyes',
            'phone_number' => '+639061112222',
            'email' => 'elena@reyes.com',
            'password' => Hash::make('password123'),
            'role' => 'resident',
            'address' => 'Purok 1, Taboc, Opol, Misamis Oriental',
        ]);

        // 5. Create Incident Reports with accurate coordinates inside Opol Municipal Bounds
        // Opol Coordinates Reference: Latitude 8.5200 - 8.5300 | Longitude 124.5700 - 124.5800
        $incident1 = IncidentDetail::create([
            'user_id' => $responder->id,
            'incident_id' => 'INC-1001',
            'emergency_type_id' => 1,
            'status' => 'completed',
            'report_date' => now()->subHours(5),
        ]);
        IncidentLocation::create([
            'incident_detail_id' => $incident1->id,
            'barangay_id' => 1,
            'latitude' => 8.51900000,
            'longitude' => 124.57650000,
        ]);

        $incident2 = IncidentDetail::create([
            'user_id' => $responder->id,
            'incident_id' => 'INC-1002',
            'emergency_type_id' => 1,
            'status' => 'completed',
            'report_date' => now()->subHours(2),
        ]);
        IncidentLocation::create([
            'incident_detail_id' => $incident2->id,
            'barangay_id' => 2,
            'latitude' => 8.52050000,
            'longitude' => 124.57900000,
        ]);

        $incident3 = IncidentDetail::create([
            'user_id' => null, // Not yet claimed by a responder
            'incident_id' => 'INC-1003',
            'emergency_type_id' => 1,
            'status' => 'pending',
            'report_date' => now()->subMinutes(30),
        ]);
        IncidentLocation::create([
            'incident_detail_id' => $incident3->id,
            'barangay_id' => 3,
            'latitude' => 8.51300000,
            'longitude' => 124.56800000,
        ]);

        $incident4 = IncidentDetail::create([
            'user_id' => $responder->id,
            'incident_id' => 'INC-1004',
            'emergency_type_id' => 1,
            'status' => 'active',
            'report_date' => now()->subMinutes(15),
        ]);
        IncidentLocation::create([
            'incident_detail_id' => $incident4->id,
            'barangay_id' => 4,
            'latitude' => 8.51050000,
            'longitude' => 124.60100000,
        ]);

        // 6. Create Patient Care Reports (PCRs) with complete diagnostic metadata
        $pcr1 = PatientCareRecord::create([
            'user_id' => $responder->id,
            'patient_id' => $patient1->id,
            'incident_detail_id' => $incident1->id,
            'status' => 'completed',
            'report_date' => now()->subHours(5),
            'pcr_data' => [
                'personal' => [
                    'full_name' => 'Juan Dela Cruz',
                    'caller_name' => 'Roberto Dela Cruz',
                    'emergency_type' => 'Heart attack',
                    'age' => '41',
                    'gender' => 'Male',
                    'birthdate' => '1985-05-12',
                    'civil_status' => 'Married',
                    'contact_number' => '+639500905679',
                    'address' => 'Purok 3, Barangay Poblacion, Opol, Misamis Oriental',
                    'nationality' => 'Filipino',
                    'blood_type' => 'A+',
                ],
                'dispatch_info' => [
                    'caller_name' => 'Roberto Dela Cruz',
                    'caller_phone' => '+639500905679',
                    'caller_address' => 'Purok 3, Barangay Poblacion, Opol, Misamis Oriental',
                    'emergency_type' => 'Heart attack',
                    'is_registered' => true,
                    'gps_enabled' => true,
                    'is_near_accident' => true,
                ],
                'medical' => [
                    'consciousness' => 'Conscious',
                    'breathing' => 'Normal',
                    'pulse_rate' => '94',
                    'blood_pressure' => '140/90',
                    'temperature' => '36.6',
                    'oxygen' => '95',
                ],
                'injuries' => [
                    'head_injury' => false,
                    'arm_fracture' => false,
                    'chest_pain' => true,
                    'burns' => false,
                    'bleeding' => false,
                    'unconscious' => false,
                    'description' => 'Patient complained of acute radiating chest pain and numbness in the left arm.',
                ],
                'treatment' => [
                    'bandaging' => false,
                    'oxygen_support' => true,
                    'immobilization' => false,
                    'notes' => 'Administered low-flow oxygen therapy support. Patient vitals stabilized before transport.',
                ],
                'transport' => [
                    'to' => 'Capitol University Medical Center',
                    'arrival_time' => '10:45 AM',
                    'condition' => 'Stable',
                    'notes' => 'Patient safely transferred to emergency room staff.',
                ],
                'signatures' => [
                    'responder' => 'John Doe, EMT',
                    'receiving_staff' => 'Nurse Ramos',
                    'datetime' => 'May 30, 2026 10:50 AM',
                ],
            ],
        ]);

        $pcr2 = PatientCareRecord::create([
            'user_id' => $responder->id,
            'patient_id' => $patient2->id,
            'incident_detail_id' => $incident2->id,
            'status' => 'completed',
            'report_date' => now()->subHours(2),
            'pcr_data' => [
                'personal' => [
                    'full_name' => 'Maria Santos',
                    'caller_name' => 'Pedro Santos',
                    'emergency_type' => 'Severe bleeding',
                    'age' => '35',
                    'gender' => 'Female',
                    'birthdate' => '1990-08-20',
                    'civil_status' => 'Married',
                    'contact_number' => '+639123456789',
                    'address' => 'Purok 5, Riverside, Opol, Misamis Oriental',
                    'nationality' => 'Filipino',
                    'blood_type' => 'O+',
                ],
                'dispatch_info' => [
                    'caller_name' => 'Pedro Santos',
                    'caller_phone' => '+639123456789',
                    'caller_address' => 'Purok 5, Riverside, Opol, Misamis Oriental',
                    'emergency_type' => 'Severe bleeding',
                    'is_registered' => true,
                    'gps_enabled' => true,
                    'is_near_accident' => false,
                ],
                'medical' => [
                    'consciousness' => 'Conscious',
                    'breathing' => 'Normal',
                    'pulse_rate' => '88',
                    'blood_pressure' => '120/80',
                    'temperature' => '36.8',
                    'oxygen' => '98',
                ],
                'injuries' => [
                    'head_injury' => true,
                    'arm_fracture' => true,
                    'chest_pain' => false,
                    'burns' => false,
                    'bleeding' => true,
                    'unconscious' => false,
                    'description' => 'Laceration on right forehead with mild hemorrhage. Suspected fracture of the left radius bone.',
                ],
                'treatment' => [
                    'bandaging' => true,
                    'oxygen_support' => false,
                    'immobilization' => true,
                    'notes' => 'Wound cleaned and sterile dressing applied. Rigid splint secured on left arm to immobilize fracture.',
                ],
                'transport' => [
                    'to' => 'Northern Mindanao Medical Center',
                    'arrival_time' => '1:10 PM',
                    'condition' => 'Stable',
                    'notes' => 'Patient kept calm during transfer. Vitals checked every 5 mins.',
                ],
                'signatures' => [
                    'responder' => 'John Doe, EMT',
                    'receiving_staff' => 'Nurse Ramos',
                    'datetime' => 'May 30, 2026 1:15 PM',
                ],
            ],
        ]);
        // 7. Create Inventory Items for Staff 1 Dashboard
        InventoryItem::create([
            'name' => 'First Aid Kits (Standard)',
            'category' => 'Medical',
            'quantity' => 15,
            'restock_level' => 20,
            'status' => 'Low Stock'
        ]);

        InventoryItem::create([
            'name' => 'Portable Oxygen Cylinders',
            'category' => 'Other',
            'quantity' => 8,
            'restock_level' => 10,
            'status' => 'Low Stock'
        ]);

        InventoryItem::create([
            'name' => 'Ambulance Unit A',
            'category' => 'Vehicle',
            'quantity' => 1,
            'restock_level' => 1,
            'status' => 'Available'
        ]);

        InventoryItem::create([
            'name' => 'Bandages (Box)',
            'category' => 'Medical',
            'quantity' => 50,
            'restock_level' => 10,
            'status' => 'Available'
        ]);

        // 8. Create Trained Personnel
        \App\Models\TrainedPersonnel::create([
            'name' => 'Juan Dela Cruz',
            'age' => 28,
            'sex' => 'Male',
            'barangay_id' => 1
        ]);
        
        \App\Models\TrainedPersonnel::create([
            'name' => 'Maria Santos',
            'age' => 34,
            'sex' => 'Female',
            'barangay_id' => 2
        ]);

        \App\Models\TrainedPersonnel::create([
            'name' => 'Pedro Penduko',
            'age' => 45,
            'sex' => 'Male',
            'barangay_id' => 3
        ]);
    }
}
