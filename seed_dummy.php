<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

$user = new User;
$user->first_name = 'Juan';
$user->last_name = 'Dela Cruz';
$user->phone_number = '+639191234567';
$user->email = 'juandelacruz' . rand(100, 999) . '@example.com';
$user->password = Hash::make('password123');
$user->role = 'resident'; // Valid enum: resident
$user->approved = true;
$user->address = 'Purok 1, Barra, Opol, Misamis Oriental';
$user->civil_status = 'Married';
$user->age = 35;
$user->gender = 'Male';
$user->gps_enabled = true;
$user->save();

echo "Dummy resident added successfully!\n";
