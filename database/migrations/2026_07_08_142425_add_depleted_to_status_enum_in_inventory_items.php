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
        DB::statement("ALTER TABLE inventory_items MODIFY COLUMN status ENUM('Available', 'Low Stock', 'Serviceable', 'Unserviceable', 'Unavailable') DEFAULT 'Available'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('inventory_items')->where('status', 'depleted')->update(['status' => 'unserviceable']);
        DB::statement("ALTER TABLE inventory_items MODIFY COLUMN status ENUM('available', 'low stock', 'serviceable', 'unserviceable') DEFAULT 'available'");
    }
};
