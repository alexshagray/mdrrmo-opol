<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update existing data to match new enum
        DB::table('inventory_items')->where('status', 'Available')->update(['status' => 'available']);
        DB::table('inventory_items')->where('status', 'Low Stock')->update(['status' => 'low stock']);
        DB::table('inventory_items')->where('status', 'Depleted')->update(['status' => 'unserviceable']);
        DB::table('inventory_items')->where('status', 'In Use')->update(['status' => 'serviceable']);
        DB::table('inventory_items')->where('status', 'Maintenance')->update(['status' => 'unserviceable']);

        // Alter the column enum
        DB::statement("ALTER TABLE inventory_items MODIFY COLUMN status ENUM('Available', 'Low Stock', 'Serviceable', 'Unserviceable') DEFAULT 'Available'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Update existing data back
        DB::table('inventory_items')->where('status', 'available')->update(['status' => 'Available']);
        DB::table('inventory_items')->where('status', 'low stock')->update(['status' => 'Low Stock']);
        DB::table('inventory_items')->where('status', 'serviceable')->update(['status' => 'In Use']);
        DB::table('inventory_items')->where('status', 'unserviceable')->update(['status' => 'Depleted']);

        DB::statement("ALTER TABLE inventory_items MODIFY COLUMN status ENUM('Available', 'In Use', 'Maintenance', 'Depleted', 'Low Stock') DEFAULT 'Available'");
    }
};
