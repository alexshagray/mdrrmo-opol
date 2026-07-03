<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use App\Models\TrainedPersonnel;
use Illuminate\Support\Facades\DB;

// Add zone column if it doesn't exist
if (!Schema::hasColumn('trained_personnels', 'zone')) {
    Schema::table('trained_personnels', function (Blueprint $table) {
        $table->string('zone')->nullable()->after('sex');
    });
    echo "Added 'zone' column to trained_personnels table.\n";
} else {
    echo "'zone' column already exists.\n";
}

// Split existing data
$personnels = TrainedPersonnel::all();
$updated = 0;

foreach ($personnels as $personnel) {
    // Check if barangay has pattern like "Z-2, BARRA" or "Z-3 IGPIT"
    if (preg_match('/^(Z-[\w\d]+)[,\s]+(.*)$/i', $personnel->barangay, $matches)) {
        $personnel->zone = trim($matches[1]);
        $personnel->barangay = trim($matches[2]);
        $personnel->save();
        $updated++;
    }
}

echo "Migrated $updated records.\n";
